import type { CacheEntry, CacheConfig, Resource, CacheUpdate, ResourceCache, CacheMapView } from "./types";

/** Global configuration for all resource caches including size limits and LRU behavior */
let cacheConfig: CacheConfig = {
  maxSize: 1000,
  enableLRU: true,
};

/** Sentinel scope for manual resourceCache.set() entries */
const PUBLIC_SCOPE = Symbol("public");

/** Nested cache: fetcher → cache key → entry. Isolates resources by fetcher identity. */
export const cacheMap = new Map<unknown, Map<unknown, CacheEntry<unknown>>>();

/** Timestamp of last cache cleanup operation to throttle cleanup frequency */
let lastCleanupTime = 0;

/** Network online status tracking */
let onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
const onlineCallbacks = new Set<(online: boolean) => void>();

/** Setup network status listeners once */
if (typeof window !== 'undefined') {
  const handleOnline = () => {
    onlineStatus = true;
    onlineCallbacks.forEach(cb => cb(true));
  };

  const handleOffline = () => {
    onlineStatus = false;
    onlineCallbacks.forEach(cb => cb(false));
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

/**
 * Gets or creates the inner map for a fetcher scope
 * @param scope The fetcher or PUBLIC_SCOPE sentinel
 */
const getScope = (scope: unknown): Map<unknown, CacheEntry<unknown>> => {
  let inner = cacheMap.get(scope);
  if (!inner) {
    inner = new Map();
    cacheMap.set(scope, inner);
  }
  return inner;
};

/**
 * Computes total entry count across all fetcher scopes
 */
const totalSize = (): number => {
  let size = 0;
  for (const [, inner] of cacheMap) size += inner.size;
  return size;
};

/**
 * Checks if a cache entry is stale based on its staleTime
 * @template T
 * @param entry Cache entry to check
 * @returns True if entry is stale, false otherwise
 */
export function isStale<T>(entry: CacheEntry<T>): boolean {
  if (entry.staleTime === Infinity) return false;
  return Date.now() - entry.timestamp > entry.staleTime;
}

/**
 * Performs periodic cleanup of expired cache entries to prevent memory leaks.
 * Uses batched processing and throttling to minimize performance impact.
 */
export function cleanupExpiredCache() {
  const now = Date.now();

  // Throttle cleanup to avoid excessive processing
  if (lastCleanupTime && now - lastCleanupTime < 60000) return;

  lastCleanupTime = now;
  let cleanedCount = 0;

  for (const [, inner] of cacheMap) {
    if (cleanedCount >= 100) break;

    const keysToDelete: unknown[] = [];
    for (const [key, entry] of inner) {
      if (now - entry.timestamp > entry.cacheTime) {
        keysToDelete.push(key);
        cleanedCount++;
      }
    }
    keysToDelete.forEach(key => inner.delete(key));
  }
}

/**
 * Sets data in a fetcher-scoped cache with optional TTL and staleTime
 * @template T
 * @param scope Fetcher identity for cache isolation
 * @param key Cache key
 * @param data Data to cache
 * @param cacheTime Cache time in milliseconds (0 = no caching)
 * @param staleTime Stale time in milliseconds (defaults to 0)
 */
export function setCacheData<T>(scope: unknown, key: unknown, data: T, cacheTime = 0, staleTime = 0): void {
  if (!cacheTime) return;

  cleanupExpiredCache();

  const now = Date.now();
  getScope(scope).set(key, {
    data,
    timestamp: now,
    cacheTime,
    staleTime,
    lastAccess: now
  } as CacheEntry<T>);

  // LRU eviction when cache exceeds max size (global across all scopes)
  const maxSize = cacheConfig.maxSize;
  if (maxSize && cacheConfig.enableLRU && totalSize() > maxSize) {
    const size = totalSize();
    const entriesToEvict = size - maxSize;

    // Flatten all entries for global LRU sort
    const allEntries: Array<{ scope: unknown, key: unknown, lastAccess: number }> = [];
    for (const [scopeRef, inner] of cacheMap) {
      for (const [entryKey, entry] of inner) {
        allEntries.push({ scope: scopeRef, key: entryKey, lastAccess: entry.lastAccess });
      }
    }
    allEntries.sort((a, b) => a.lastAccess - b.lastAccess);

    let i = 0;
    for (; i < entriesToEvict; i++) {
      cacheMap.get(allEntries[i].scope)?.delete(allEntries[i].key);
    }
  }
}

/**
 * Gets data from a fetcher-scoped cache
 * @template T
 * @param scope Fetcher identity for cache isolation
 * @param key Cache key
 * @returns Cached data or undefined if not found/expired
 */
export function getCacheData<T = unknown>(scope: unknown, key: unknown): T | undefined {
  const inner = cacheMap.get(scope);
  if (!inner) return undefined;

  const entry = inner.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;

  // Check if entry is expired
  if (Date.now() - entry.timestamp >= entry.cacheTime) {
    inner.delete(key);
    return undefined;
  }

  // Update last access for LRU
  entry.lastAccess = Date.now();
  return entry.data;
}

/**
 * Updates existing cached data in a fetcher-scoped cache using an updater function or direct value.
 * @template T
 * @param scope Fetcher identity for cache isolation
 * @param key Cache key to update
 * @param updater New value or function that receives old value and returns new value
 * @returns True if update succeeded, false if entry not found/expired
 */
export function updateCacheData<T>(
  scope: unknown,
  key: unknown,
  updater: T | ((old: T | undefined) => T)
): boolean {
  const inner = cacheMap.get(scope);
  if (!inner) return false;

  const entry = inner.get(key) as CacheEntry<T> | undefined;
  if (!entry) return false;

  // Check if entry is expired
  if (Date.now() - entry.timestamp >= entry.cacheTime) {
    inner.delete(key);
    return false;
  }

  const newData = typeof updater === 'function'
    ? (updater as (old: T | undefined) => T)(entry.data)
    : updater;

  entry.data = newData;
  entry.lastAccess = Date.now();
  return true;
}

/**
 * Flattened view over the nested cache for the public resourceCache.map API.
 * Searches across all fetcher scopes transparently.
 */
const flatView: CacheMapView = {
  get size() { return totalSize() },
  get(key: unknown) {
    for (const [, inner] of cacheMap) {
      const entry = inner.get(key) as CacheEntry<unknown> | undefined;
      if (entry && Date.now() - entry.timestamp < entry.cacheTime) return entry;
    }
    return undefined;
  },
  has(key: unknown) {
    for (const [, inner] of cacheMap) {
      const entry = inner.get(key);
      if (entry && Date.now() - entry.timestamp < entry.cacheTime) return true;
    }
    return false;
  },
  clear() { cacheMap.clear() },
};

/**
 * Searches all fetcher scopes for a key, deletes it where found
 */
const invalidateGlobal = (key: unknown): void => {
  for (const [, inner] of cacheMap) inner.delete(key);
};

/**
 * Consolidated resourceCache API providing all cache functionality in a single performant entity
 */
export const resourceCache: ResourceCache = {
  get map() { return flatView },
  get config() { return cacheConfig },
  setConfig: (config: Partial<CacheConfig>) => cacheConfig = { ...cacheConfig, ...config },
  set: <K, T>(key: K, data: T, cacheTime = 0, staleTime = 0) => {
    setCacheData(PUBLIC_SCOPE, key, data, cacheTime, staleTime);
    return key;
  },
  get: <T = unknown>(key: unknown): T | undefined => {
    for (const [, inner] of cacheMap) {
      const entry = inner.get(key) as CacheEntry<T> | undefined;
      if (!entry) continue;
      if (Date.now() - entry.timestamp >= entry.cacheTime) {
        inner.delete(key);
        continue;
      }
      entry.lastAccess = Date.now();
      return entry.data;
    }
    return undefined;
  },
  update: <T>(key: unknown, updater: T | ((old: T | undefined) => T)): boolean => {
    for (const [scope, inner] of cacheMap) {
      if (updateCacheData(scope, key, updater)) return true;
    }
    return false;
  },
  cleanup: cleanupExpiredCache,
  updateMultiple: <T>(updates: Array<CacheUpdate<T>>) => updates.forEach(({ key, updater }) => {
    for (const [scope, inner] of cacheMap) {
      if (updateCacheData(scope, key, updater)) return;
    }
  }),
  invalidate: invalidateGlobal,
  invalidateMultiple: (keys: unknown[]) => keys.forEach(key => invalidateGlobal(key)),
  invalidateByPrefix: (prefix: string) => {
    let count = 0;
    for (const [, inner] of cacheMap) {
      const keysToDelete: unknown[] = [];
      for (const key of inner.keys()) {
        if (typeof key === 'string' && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => { inner.delete(key); count++ });
    }
    return count;
  },
  invalidateByPattern: (pattern: RegExp) => {
    let count = 0;
    for (const [, inner] of cacheMap) {
      const keysToDelete: unknown[] = [];
      for (const key of inner.keys()) {
        if (typeof key === 'string' && pattern.test(key)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => { inner.delete(key); count++ });
    }
    return count;
  },
  invalidateAll: () => {
    const count = totalSize();
    cacheMap.clear();
    return count;
  },
  createKeyGenerator: <T>() => (template: (params: T) => unknown) => (params: T) => template(params),
  invalidateResources: (resources: Array<Pick<Resource<any>, 'invalidate'>>) => resources.forEach(resource => resource.invalidate()),
  isOnline: () => onlineStatus,
  onOnlineChange: (callback: (online: boolean) => void) => {
    onlineCallbacks.add(callback);
    return () => onlineCallbacks.delete(callback);
  },
};
