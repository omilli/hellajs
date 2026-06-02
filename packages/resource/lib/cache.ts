import type { CacheEntry, CacheConfig, Resource, CacheUpdate, ResourceCache } from "./types";

/** Global configuration for all resource caches including size limits and LRU behavior */
let cacheConfig: CacheConfig = {
  maxSize: 1000,
  enableLRU: true,
};

/** Global cache storage mapping cache keys to their corresponding cache entries */
export const cacheMap = new Map<unknown, CacheEntry<unknown>>();

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

  // Process entries in batches to prevent blocking
  const keysToDelete: unknown[] = [];
  for (const [key, entry] of cacheMap) {
    if (cleanedCount >= 100) break;

    if (now - entry.timestamp > entry.cacheTime) {
      keysToDelete.push(key);
      cleanedCount++;
    }
  }

  // Delete keys after iteration to avoid concurrent modification
  keysToDelete.forEach(key => cacheMap.delete(key));
}

/**
 * Sets data in the resource cache with optional TTL and staleTime
 * @template T
 * @param key Cache key
 * @param data Data to cache
 * @param cacheTime Optional cache time in milliseconds (defaults to no caching)
 * @param staleTime Optional stale time in milliseconds (defaults to 0)
 */
export function setCacheData<T>(key: unknown, data: T, cacheTime = 0, staleTime = 0): void {
  if (!cacheTime) return;

  cleanupExpiredCache();

  const now = Date.now();
  cacheMap.set(key, {
    data,
    timestamp: now,
    cacheTime,
    staleTime,
    lastAccess: now
  } as CacheEntry<T>);

  // LRU eviction when cache exceeds max size
  const maxSize = cacheConfig.maxSize;
  if (maxSize && cacheConfig.enableLRU && cacheMap.size > maxSize) {
    const entriesToEvict = cacheMap.size - maxSize;
    const entries = Array.from(cacheMap.entries()).map(([cacheKey, entry]) => ({
      cacheKey,
      entry,
      lastAccess: entry.lastAccess
    }));
    entries.sort((a, b) => a.lastAccess - b.lastAccess);
    let i = 0;
    for (; i < entriesToEvict; i++)
      cacheMap.delete(entries[i].cacheKey);
  }
}

/**
 * Gets data from the resource cache
 * @template T
 * @param key Cache key
 * @returns Cached data or undefined if not found/expired
 */
export function getCacheData<T = unknown>(key: unknown): T | undefined {
  const entry = cacheMap.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;

  // Check if entry is expired
  if (Date.now() - entry.timestamp >= entry.cacheTime) {
    cacheMap.delete(key);
    return undefined;
  }

  // Update last access for LRU
  entry.lastAccess = Date.now();
  return entry.data;
}

/**
 * Updates existing cached data using an updater function or direct value.
 * @template T
 * @param key Cache key to update
 * @param updater New value or function that receives old value and returns new value
 * @returns True if update succeeded, false if entry not found/expired
 */
export function updateCacheData<T>(
  key: unknown,
  updater: T | ((old: T | undefined) => T)
): boolean {
  const entry = cacheMap.get(key) as CacheEntry<T> | undefined;
  if (!entry) return false;

  // Check if entry is expired
  if (Date.now() - entry.timestamp >= entry.cacheTime) {
    cacheMap.delete(key);
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
 * Consolidated resourceCache API providing all cache functionality in a single performant entity
 */
export const resourceCache: ResourceCache = {
  get map() { return cacheMap },
  get config() { return cacheConfig },
  setConfig: (config: Partial<CacheConfig>) => cacheConfig = { ...cacheConfig, ...config },
  set: <K, T>(key: K, data: T, cacheTime = 0, staleTime = 0) => {
    setCacheData(key, data, cacheTime, staleTime);
    return key;
  },
  get: <T = unknown>(key: unknown): T | undefined => getCacheData<T>(key),
  update: updateCacheData,
  cleanup: cleanupExpiredCache,
  updateMultiple: <T>(updates: Array<CacheUpdate<T>>) => updates.forEach(({ key, updater }) => updateCacheData(key, updater)),
  invalidate: (key: unknown) => cacheMap.delete(key),
  invalidateMultiple: (keys: unknown[]) => keys.forEach(key => cacheMap.delete(key)),
  invalidateByPrefix: (prefix: string) => {
    let count = 0;
    for (const key of cacheMap.keys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        cacheMap.delete(key);
        count++;
      }
    }
    return count;
  },
  invalidateByPattern: (pattern: RegExp) => {
    let count = 0;
    for (const key of cacheMap.keys()) {
      if (typeof key === 'string' && pattern.test(key)) {
        cacheMap.delete(key);
        count++;
      }
    }
    return count;
  },
  invalidateAll: () => {
    const count = cacheMap.size;
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

