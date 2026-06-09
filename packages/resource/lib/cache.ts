import type { CacheEntry, CacheConfig, Resource, CacheUpdate, ResourceCache, CacheMapView } from "./types";
import { hasNavigator, hasWindow } from "./internal/core";

let cacheConfig: CacheConfig = {
  maxSize: 1000,
  enableLRU: true,
};

const PUBLIC_SCOPE = Symbol("public");

export const cacheMap = new Map<unknown, Map<unknown, CacheEntry<unknown>>>();

let lastCleanupTime = 0;

let onlineStatus = hasNavigator() ? navigator.onLine : true;
const onlineCallbacks = new Set<(online: boolean) => void>();

if (hasWindow()) {
  const handleOnline = () => {
    onlineStatus = true;
    const cbs = Array.from(onlineCallbacks);
    let i = 0;
    const len = cbs.length;
    while (i < len) cbs[i++]!(true);
  };

  const handleOffline = () => {
    onlineStatus = false;
    const cbs = Array.from(onlineCallbacks);
    let i = 0;
    const len = cbs.length;
    while (i < len) cbs[i++]!(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

const getScope = (scope: unknown): Map<unknown, CacheEntry<unknown>> => {
  let inner = cacheMap.get(scope);
  if (!inner) {
    inner = new Map();
    cacheMap.set(scope, inner);
  }
  return inner;
};

const totalSize = (): number => {
  let size = 0;
  const scopes = Array.from(cacheMap.values());
  let i = 0;
  const len = scopes.length;
  while (i < len) size += scopes[i++]!.size;
  return size;
};

export function isStale<T>(entry: CacheEntry<T>): boolean {
  if (entry.staleTime === Infinity) return false;
  return Date.now() - entry.timestamp > entry.staleTime;
}

export function cleanupExpiredCache() {
  const now = Date.now();

  if (lastCleanupTime && now - lastCleanupTime < 60000) return;

  lastCleanupTime = now;
  let cleanedCount = 0;

  const scopes = Array.from(cacheMap.values());
  let s = 0;
  const slen = scopes.length;
  while (s < slen) {
    if (cleanedCount >= 100) break;

    const inner = scopes[s++]!;
    const keysToDelete: unknown[] = [];
    const entries = Array.from(inner.entries());
    let i = 0;
    const len = entries.length;
    while (i < len) {
      const [key, entry] = entries[i++]!;
      if (now - entry.timestamp > entry.cacheTime) {
        keysToDelete.push(key);
        cleanedCount++;
      }
    }
    let k = 0;
    const klen = keysToDelete.length;
    while (k < klen) inner.delete(keysToDelete[k++]!);
  }
}

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

  const maxSize = cacheConfig.maxSize;
  if (maxSize && cacheConfig.enableLRU && totalSize() > maxSize) {
    const size = totalSize();
    const entriesToEvict = size - maxSize;

    const allEntries: Array<{ scope: unknown, key: unknown, lastAccess: number }> = [];
    const scopeEntries = Array.from(cacheMap.entries());
    let s = 0;
    const slen = scopeEntries.length;
    while (s < slen) {
      const [scopeRef, inner] = scopeEntries[s++]!;
      const innerEntries = Array.from(inner.entries());
      let i = 0;
      const len = innerEntries.length;
      while (i < len) {
        const [entryKey, entry] = innerEntries[i++]!;
        allEntries.push({ scope: scopeRef, key: entryKey, lastAccess: entry.lastAccess });
      }
    }
    allEntries.sort((a, b) => a.lastAccess - b.lastAccess);

    let i = 0;
    while (i < entriesToEvict) {
      const entry = allEntries[i++]!;
      cacheMap.get(entry.scope)?.delete(entry.key);
    }
  }
}

export function getCacheData<T = unknown>(scope: unknown, key: unknown): T | undefined {
  const inner = cacheMap.get(scope);
  if (!inner) return undefined;

  const entry = inner.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;

  if (Date.now() - entry.timestamp >= entry.cacheTime) {
    inner.delete(key);
    return undefined;
  }

  entry.lastAccess = Date.now();
  return entry.data;
}

export function updateCacheData<T>(
  scope: unknown,
  key: unknown,
  updater: T | ((old: T | undefined) => T)
): boolean {
  const inner = cacheMap.get(scope);
  if (!inner) return false;

  const entry = inner.get(key) as CacheEntry<T> | undefined;
  if (!entry) return false;

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

const flatView: CacheMapView = {
  get size() { return totalSize() },
  get(key: unknown) {
    const scopes = Array.from(cacheMap.values());
    let i = 0;
    const len = scopes.length;
    while (i < len) {
      const inner = scopes[i++]!;
      const entry = inner.get(key) as CacheEntry<unknown> | undefined;
      if (entry && Date.now() - entry.timestamp < entry.cacheTime) return entry;
    }
    return undefined;
  },
  has(key: unknown) {
    const scopes = Array.from(cacheMap.values());
    let i = 0;
    const len = scopes.length;
    while (i < len) {
      const inner = scopes[i++]!;
      const entry = inner.get(key);
      if (entry && Date.now() - entry.timestamp < entry.cacheTime) return true;
    }
    return false;
  },
  clear() { cacheMap.clear() },
};

const invalidateGlobal = (key: unknown): void => {
  const scopes = Array.from(cacheMap.values());
  let i = 0;
  const len = scopes.length;
  while (i < len) scopes[i++]!.delete(key);
};

export const resourceCache: ResourceCache = {
  get map() { return flatView },
  get config() { return cacheConfig },
  setConfig: (config: Partial<CacheConfig>) => cacheConfig = { ...cacheConfig, ...config },
  set: <K, T>(key: K, data: T, cacheTime = 0, staleTime = 0) => {
    setCacheData(PUBLIC_SCOPE, key, data, cacheTime, staleTime);
    return key;
  },
  get: <T = unknown>(key: unknown): T | undefined => {
    const scopeEntries = Array.from(cacheMap.entries());
    let i = 0;
    const len = scopeEntries.length;
    while (i < len) {
      const [, inner] = scopeEntries[i++]!;
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
    const scopeEntries = Array.from(cacheMap.entries());
    let i = 0;
    const len = scopeEntries.length;
    while (i < len) {
      const [scope] = scopeEntries[i++]!;
      if (updateCacheData(scope, key, updater)) return true;
    }
    return false;
  },
  cleanup: cleanupExpiredCache,
  updateMultiple: <T>(updates: Array<CacheUpdate<T>>) => {
    let u = 0;
    const ulen = updates.length;
    while (u < ulen) {
      const { key, updater } = updates[u++]!;
      const scopeEntries = Array.from(cacheMap.entries());
      let i = 0;
      const len = scopeEntries.length;
      while (i < len) {
        const [scope] = scopeEntries[i++]!;
        if (updateCacheData(scope, key, updater)) break;
      }
    }
  },
  invalidate: invalidateGlobal,
  invalidateMultiple: (keys: unknown[]) => {
    let i = 0;
    const len = keys.length;
    while (i < len) invalidateGlobal(keys[i++]!);
  },
  invalidateByPrefix: (prefix: string) => {
    let count = 0;
    const scopes = Array.from(cacheMap.values());
    let s = 0;
    const slen = scopes.length;
    while (s < slen) {
      const inner = scopes[s++]!;
      const keysToDelete: unknown[] = [];
      const keys = Array.from(inner.keys());
      let i = 0;
      const len = keys.length;
      while (i < len) {
        const key = keys[i++]!;
        if (typeof key === 'string' && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      let k = 0;
      const klen = keysToDelete.length;
      while (k < klen) {
        inner.delete(keysToDelete[k++]!);
        count++;
      }
    }
    return count;
  },
  invalidateByPattern: (pattern: RegExp) => {
    let count = 0;
    const scopes = Array.from(cacheMap.values());
    let s = 0;
    const slen = scopes.length;
    while (s < slen) {
      const inner = scopes[s++]!;
      const keysToDelete: unknown[] = [];
      const keys = Array.from(inner.keys());
      let i = 0;
      const len = keys.length;
      while (i < len) {
        const key = keys[i++]!;
        if (typeof key === 'string' && pattern.test(key)) {
          keysToDelete.push(key);
        }
      }
      let k = 0;
      const klen = keysToDelete.length;
      while (k < klen) {
        inner.delete(keysToDelete[k++]!);
        count++;
      }
    }
    return count;
  },
  invalidateAll: () => {
    const count = totalSize();
    cacheMap.clear();
    return count;
  },
  createKeyGenerator: <T>() => (template: (params: T) => unknown) => (params: T) => template(params),
  invalidateResources: (resources: Array<Pick<Resource<unknown>, 'invalidate'>>) => {
    let i = 0;
    const len = resources.length;
    while (i < len) resources[i++]!.invalidate();
  },
  isOnline: () => onlineStatus,
  onOnlineChange: (callback: (online: boolean) => void) => {
    onlineCallbacks.add(callback);
    return () => onlineCallbacks.delete(callback);
  },
};
