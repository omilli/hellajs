import { signal, computed, effect, untracked } from "@hellajs/core";
import type { CacheEntry, ResourceOptions, Resource, CacheConfig, ResourceError, Fetcher } from "./types";

/** Global configuration for all resource caches including size limits and LRU behavior */
let globalCacheConfig: CacheConfig = {
  maxSize: 1000,
  enableLRU: true,
};

/** Global cache storage mapping cache keys to their corresponding cache entries */
const cacheMap = new Map<unknown, CacheEntry<unknown>>();

/** Timestamp of last cache cleanup operation to throttle cleanup frequency */
let lastCleanupTime = Date.now();

/** 
 * Map tracking ongoing requests for deduplication purposes.
 * Prevents multiple identical requests by sharing promise results.
 */
const ongoingRequestsMap = new Map<unknown, {
  promise: Promise<unknown>;
  abortController: AbortController;
  subscribers: Set<(result: unknown, error?: unknown) => void>;
}>();

/**
 * Configures global resource cache settings.
 * @param config - Partial cache configuration to merge with defaults
 */
export function resourceCacheConfig(config: Partial<CacheConfig>) {
  globalCacheConfig = { ...globalCacheConfig, ...config };
}

/**
 * Creates a reactive resource for data fetching with string URL.
 * Provides cache-first fetching, manual control, and reactive state management.
 * @template T - The expected data type
 * @param url - The URL endpoint to fetch from
 * @param options - Configuration options for the resource
 * @returns A resource object with reactive state and control methods
 */
export function resource<T = unknown>(
  url: string,
  options?: ResourceOptions<T, string>
): Resource<T>;

/**
 * Creates a reactive resource for data fetching with custom fetcher.
 * Provides cache-first fetching, manual control, and reactive state management.
 * @template T - The expected data type  
 * @template K - The cache key type
 * @param fetcher - Custom async function that performs the data fetching
 * @param options - Configuration options for the resource
 * @returns A resource object with reactive state and control methods
 */
export function resource<T, K = undefined>(
  fetcher: Fetcher<T, K>,
  options?: ResourceOptions<T, K>
): Resource<T>;

export function resource<T, K = undefined>(
  fetcher: Fetcher<T, K> | string,
  options: ResourceOptions<T, K> = {}
): Resource<T> {
  if (typeof fetcher === "string")
    return resource<T, string>(
      async (key: string) => {
        const { ok, status, statusText, json } = await fetch(key);
        if (!ok) throw new Error(`HTTP ${status}: ${statusText}`);
        return json();
      },
      { ...(options as ResourceOptions<T, string>), key: () => fetcher }
    );

  const data = signal<T | undefined>(options.initialData);
  const error = signal<ResourceError | undefined>(undefined);
  const loading = signal(false);
  const {
    enabled = true,
    deduplicate = true,
    cacheTime = 0,
    timeout,
    abortSignal,
    key = (() => undefined as unknown as K)
  } = options;

  /**
   * Handles error state updates with optional loading state
   */
  const handleError = (err?: unknown, load?: boolean) => {
    error(err ? categorizeError(err) : undefined);
    loading(load ?? false);
    options.onError?.(err);
  }

  /**
   * Handles success/abort scenarios with special abort error handling
   */
  const handleSuccessError = (err?: unknown) => err instanceof DOMException && err.name === 'AbortError' ? loading(false) : handleError(err);

  /**
   * Handles successful data retrieval
   */
  const handleSuccess = (result: T) => {
    data(result);
    loading(false);
    options.onSuccess?.(result);
  }

  /**
   * Cleans up current abort controller and returns new one
   */
  const cleanAbort = (controller?: AbortController) => {
    currentAbortController && currentAbortController.abort();
    return controller || new AbortController();
  }

  let cleanupEffect: (() => void) | undefined;
  let currentAbortController: AbortController | undefined;

  /**
   * Core fetch logic with caching, deduplication, and abort handling.
   * @param force - When true, bypasses cache and deduplication
   */
  async function run(force = false) {
    if (!enabled) return;

    const cacheKey = untracked(key);

    // Cache check phase - skip if force refresh requested
    if (!force) {
      let cached: T | undefined = undefined;
      if (cacheTime) {
        cleanupExpiredCache();
        const entry = cacheMap.get(cacheKey) as CacheEntry<T> | undefined;
        if (entry && Date.now() - entry.timestamp < cacheTime) {
          // Touch entry for LRU and return cached data
          entry.lastAccess = Date.now();
          cached = entry.data;
        }
        // Clean up invalid entry reference
        !entry && cacheMap.delete(cacheKey);
      }

      if (cached !== undefined) {
        data(cached);
        handleError(); // Clear any previous errors
        return;
      }
    }

    // Deduplication phase - reuse ongoing requests for same key
    if (deduplicate && !force) {
      const ongoing = ongoingRequestsMap.get(cacheKey) as {
        promise: Promise<T>;
        abortController: AbortController;
        subscribers: Set<(result: T, error?: unknown) => void>;
      } | undefined;

      const ongoingRequest = ongoing ? {
        promise: ongoing.promise,
        abortController: ongoing.abortController
      } : undefined;

      if (ongoingRequest) {
        const { promise, abortController } = ongoingRequest;
        // Switch to the ongoing request's abort controller
        currentAbortController = cleanAbort(abortController);
        handleError(undefined, true); // Set loading state
        try {
          // Wait for shared promise only if not already aborted
          !abortController.signal.aborted && handleSuccess(await promise);
        } catch (err) {
          handleSuccessError(err);
        }
        return;
      }
    }

    // Request initiation phase - setup abort controls and timeouts
    currentAbortController = cleanAbort();

    if (abortSignal)
      // Either abort immediately or listen for external abort
      abortSignal && abortSignal.aborted ? currentAbortController.abort()
        : abortSignal.addEventListener('abort', () => currentAbortController!.abort());

    if (timeout && timeout > 0) {
      const timeoutId = setTimeout(() => currentAbortController!.abort(), timeout);
      // Clean timeout on abort to prevent memory leaks
      currentAbortController.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    }

    const currentSignal = currentAbortController.signal;
    handleError(undefined, true); // Set loading state

    // Promise race setup - fetcher vs abort signal
    const fetcherPromise = (async () => {
      return Promise.race([
        (fetcher as Fetcher<T, K>)(cacheKey),
        new Promise<never>((_, reject) => {
          const onAbort = () => reject(new DOMException('Request was aborted', 'AbortError'));
          // Handle already aborted or listen for future abort
          currentSignal.aborted ? onAbort() : currentSignal.addEventListener('abort', onAbort);
        })
      ]);
    })();

    // Deduplication registration - track ongoing requests for sharing
    if (deduplicate && !force) {
      const subscribers = new Set<(result: T | undefined, error?: unknown) => void>();

      const entry = {
        promise: fetcherPromise,
        abortController: currentAbortController,
        subscribers
      };

      ongoingRequestsMap.set(cacheKey, entry as any);

      const handleSubscribers = (result: T | undefined, error?: unknown) => {
        // Notify all waiting subscribers and cleanup
        subscribers.forEach(callback => callback(result, error));
        ongoingRequestsMap.delete(cacheKey);
      }

      // Setup promise handlers for subscriber notification
      fetcherPromise
        .then((result) => handleSubscribers(result))
        .catch((error) => handleSubscribers(undefined, error));
    }

    try {
      const result = await fetcherPromise;

      // Cache storage with LRU eviction
      if (cacheTime) {
        cleanupExpiredCache();

        const now = Date.now();
        cacheMap.set(cacheKey, {
          data: result,
          timestamp: now,
          cacheTime,
          lastAccess: now
        } as CacheEntry<T>);

        // LRU eviction when cache exceeds max size
        const maxSize = globalCacheConfig.maxSize;
        if (maxSize && globalCacheConfig.enableLRU) {
          const currentSize = cacheMap.size;
          if (currentSize > maxSize) {
            const entriesToEvict = currentSize - maxSize;
            // Sort by lastAccess to find least recently used entries
            const entries = Array.from(cacheMap.entries()).map(([cacheKey, entry]) => ({
              cacheKey,
              entry,
              lastAccess: entry.lastAccess
            }));
            entries.sort((a, b) => a.lastAccess - b.lastAccess);
            // Remove oldest entries until we're under the limit
            let i = 0;
            for (; i < entriesToEvict; i++)
              cacheMap.delete(entries[i].cacheKey);
          }
        }
      }

      // Only update state if request wasn't aborted during execution
      !currentSignal.aborted && handleSuccess(result);
    } catch (err) {
      handleSuccessError(err);
    }
  }

  /**
   * Aborts current request and resets resource to initial state
   */
  function abort() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = undefined;
    }
    data(options.initialData);
    handleError();
  }

  /**
   * Clears cache entry and triggers fresh request
   */
  function invalidate() {
    cacheMap.delete(untracked(key));
    run(true);
  }

  // Initialize effect system without auto-fetching
  if (cleanupEffect) cleanupEffect();
  cleanupEffect = effect(() => { });

  /**
   * Computed status based on current loading, error, and data states
   */
  const status = computed(() => {
    if (loading()) return "loading";
    if (error()) return "error";

    const currentData = data();
    // Check if we're still in initial state
    if (currentData === options.initialData) return "idle";
    if (currentData !== undefined) return "success";
    return "idle";
  });

  return {
    data: computed(() => data()),
    error: computed(() => error()),
    loading: computed(() => loading()),
    status,
    fetch() {
      run(false);
    },
    request() {
      run(true);
    },
    abort,
    invalidate,
  };
}

/**
 * Categorizes errors into structured ResourceError format.
 * @param error - Raw error from fetch or other operations
 * @returns Categorized error with message, category, and optional status code
 */
function categorizeError(error: unknown): ResourceError {
  const message = error instanceof DOMException && error.name === 'AbortError'
    ? 'Request was aborted'
    : error instanceof Error ? error.message : String(error);

  // Extract HTTP status code from error message if available
  const statusMatch = error instanceof Error ? error.message.match(/^HTTP (\d+):/) : null;
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

  // Categorize based on error type and status code patterns
  const category = error instanceof DOMException && error.name === 'AbortError' ? 'abort'
    : statusCode === 404 ? 'not_found'
      : statusCode && statusCode >= 500 ? 'server'
        : statusCode && statusCode >= 400 ? 'client'
          : 'unknown';

  return {
    message,
    category,
    ...(statusCode && { statusCode }),
    originalError: error
  };
}

/**
 * Performs periodic cleanup of expired cache entries to prevent memory leaks.
 * Uses batched processing and throttling to minimize performance impact.
 */
function cleanupExpiredCache() {
  const now = Date.now();

  // Throttle cleanup to avoid excessive processing
  if (now - lastCleanupTime < 60000) return

  lastCleanupTime = now;
  let cleanedCount = 0;

  // Process entries in batches to prevent blocking
  for (const [key, entry] of cacheMap) {
    if (cleanedCount >= 100) break;

    if (now - entry.timestamp > entry.cacheTime) {
      cacheMap.delete(key);
      cleanedCount++;
    }
  }
}
