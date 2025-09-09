import { signal, computed, effect, untracked } from "@hellajs/core";
import type { CacheEntry, ResourceOptions, Resource, CacheConfig } from "./types";

const cacheMap = new Map<unknown, CacheEntry<unknown>>();

// Cache cleanup configuration
const CACHE_CLEANUP_INTERVAL = 60000; // Clean up every 60 seconds
const CACHE_CLEANUP_BATCH_SIZE = 100; // Clean up to 100 expired entries per run
const DEFAULT_MAX_CACHE_SIZE = 1000;
const DEFAULT_ENABLE_LRU = true;

let globalCacheConfig: CacheConfig = {
  maxSize: DEFAULT_MAX_CACHE_SIZE,
  enableLRU: DEFAULT_ENABLE_LRU,
};
export function resourceCacheConfig(config: Partial<CacheConfig>) {
  globalCacheConfig = { ...globalCacheConfig, ...config };
}

function evictLRUEntries() {
  const maxSize = globalCacheConfig.maxSize;
  if (!maxSize || !globalCacheConfig.enableLRU) return;

  const currentSize = cacheMap.size;
  if (currentSize <= maxSize) return;

  const entriesToEvict = currentSize - maxSize;
  const entries = Array.from(cacheMap.entries()).map(([key, entry]) => ({
    key,
    entry,
    lastAccess: entry.lastAccess
  }));

  entries.sort((a, b) => a.lastAccess - b.lastAccess);

  for (let i = 0; i < entriesToEvict; i++) {
    cacheMap.delete(entries[i].key);
  }
}
let lastCleanupTime = Date.now();

// Periodic cache cleanup to prevent memory leaks
function cleanupExpiredCache() {
  const now = Date.now();

  // Only run cleanup periodically to avoid performance impact
  if (now - lastCleanupTime < CACHE_CLEANUP_INTERVAL) {
    return;
  }

  lastCleanupTime = now;
  let cleanedCount = 0;

  // Clean up expired entries in batches to avoid blocking
  for (const [key, entry] of cacheMap) {
    if (cleanedCount >= CACHE_CLEANUP_BATCH_SIZE) {
      break;
    }

    // Check if entry is expired using its specific cacheTime
    if (now - entry.timestamp > entry.cacheTime) {
      cacheMap.delete(key);
      cleanedCount++;
    }
  }
}

/**
 * Creates a reactive resource for data fetching.
 * @template T The data type.
 * @param url The URL to fetch.
 * @param options Options for the resource.
 * @returns A resource object.
 */
export function resource<T = unknown>(
  url: string,
  options?: ResourceOptions<T, string>
): Resource<T>;

/**
 * Creates a reactive resource for data fetching.
 * @template T The data type.
 * @template K The key type.
 * @param fetcher A function that returns a promise for the data.
 * @param options Options for the resource.
 * @returns A resource object.
 */
export function resource<T, K = undefined>(
  fetcher: (key: K) => Promise<T>,
  options?: ResourceOptions<T, K>
): Resource<T>;

export function resource<T, K = undefined>(
  fetcherOrUrl: ((key: K) => Promise<T>) | string,
  options: ResourceOptions<T, K> = {}
): Resource<T> {
  if (typeof fetcherOrUrl === "string") {
    const url = fetcherOrUrl;
    return resource<T, string>(
      async (key: string) => {
        const response = await fetch(key);
        return response.json();
      },
      { ...(options as ResourceOptions<T, string>), key: () => url }
    );
  }

  const fetcher = fetcherOrUrl;

  const data = signal<T | undefined>(options.initialData);
  const error = signal<unknown>(undefined);
  const loading = signal(false);
  const enabled = options.enabled ?? true;
  const keyFn = options.key ?? (() => undefined as unknown as K);
  const cacheTime = options.cacheTime ?? 0;
  const timeout = options.timeout;
  const externalSignal = options.signal;

  let cleanupEffect: (() => void) | undefined;
  let currentAbortController: AbortController | undefined;

  function createAbortController(): AbortController {
    const controller = new AbortController();

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', () => controller.abort());
      }
    }

    if (timeout && timeout > 0) {
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
      controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    }

    return controller;
  }

  function getCache(key: K): T | undefined {
    if (!cacheTime) return undefined;

    cleanupExpiredCache();

    const entry = cacheMap.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < cacheTime) {
      entry.lastAccess = Date.now();
      return entry.data;
    }

    if (entry) {
      cacheMap.delete(key);
    }

    return undefined;
  }

  function setCache(key: K, value: T) {
    if (!cacheTime) return;

    cleanupExpiredCache();

    const now = Date.now();
    cacheMap.set(key, {
      data: value,
      timestamp: now,
      cacheTime,
      lastAccess: now
    } as CacheEntry<T>);

    evictLRUEntries();
  }

  async function run(force = false) {
    if (!enabled) return;

    if (currentAbortController) {
      currentAbortController.abort();
    }

    currentAbortController = createAbortController();
    const signal = currentAbortController.signal;

    const key = untracked(keyFn);
    if (!force) {
      const cached = getCache(key);
      if (cached !== undefined && !signal.aborted) {
        data(cached);
        error(undefined);
        loading(false);
        return;
      }
    }

    loading(true);
    error(undefined);

    try {
      const abortPromise = new Promise<never>((_, reject) => {
        const onAbort = () => {
          reject(new DOMException('Request was aborted', 'AbortError'));
        };

        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort);
        }
      });

      const result = await Promise.race([
        fetcher(key),
        abortPromise
      ]);

      setCache(key, result);

      if (!signal.aborted) {
        data(result);
        loading(false);
        options.onSuccess?.(result);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        loading(false);
      } else if (!signal.aborted) {
        error(err);
        loading(false);
        options.onError?.(err);
      }
    }
  }

  function cache() {
    run(false);
  }

  function request() {
    run(true);
  }

  function abort() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = undefined;
    }
    data(options.initialData);
    error(undefined);
    loading(false);
  }

  function invalidate() {
    cacheMap.delete(untracked(keyFn));
    request();
  }

  // Remove initial auto-fetch effect
  if (cleanupEffect) cleanupEffect();
  cleanupEffect = effect(() => {
    // No-op: do not auto-fetch on creation
  });

  const status = computed(() => {
    if (loading()) return "loading";
    if (error()) return "error";

    // Cache the data() result to avoid multiple signal reads
    const currentData = data();
    if (currentData === options.initialData) return "idle";
    if (currentData !== undefined) return "success";
    return "idle";
  });

  return {
    data: computed(() => data()),
    error: computed(() => error()),
    loading: computed(() => loading()),
    status,
    fetch: cache,
    request,
    abort,
    invalidate,
  };
}
