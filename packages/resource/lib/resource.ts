import { signal, computed, effect, untracked } from "@hellajs/core";
import type { CacheEntry, ResourceOptions, Resource, ResourceError, Fetcher } from "./types";
import { cacheMap, cacheConfig, cleanupExpiredCache, setCacheData, updateCacheData, getCacheData } from "./cache";

/** Map tracking ongoing requests to prevent duplicate network calls */
export const ongoingRequestsMap = new Map();

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
      { ...options, key: fetcher } as unknown as ResourceOptions<T, string>
    );

  const data = signal<T | undefined>(options.initialData);
  const error = signal<ResourceError | undefined>(undefined);
  const loading = signal(false);
  const {
    enabled = true,
    auto = false,
    deduplicate = true,
    cacheTime = 0,
    timeout,
    abortSignal,
    key = (() => undefined as unknown as K)
  } = options;

  /**
   * Resolves the key value, handling both function and static value cases
   */
  const resolveKey = () => typeof key === 'function' ? (key as () => K)() : key;

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
  let mutationContext: unknown;

  /**
   * Core fetch logic with caching, deduplication, and abort handling.
   * @param force - When true, bypasses cache and deduplication
   */
  async function run(force = false) {
    if (!enabled) return;

    const cacheKey = untracked(resolveKey);

    // Cache check phase - skip if force refresh requested
    if (!force) {
      if (cacheTime) {
        cleanupExpiredCache();
        const cached = getCacheData(cacheKey) as T | undefined;
        if (cached !== undefined) {
          data(cached);
          handleError(); // Clear any previous errors
          return;
        }
      }

      // Deduplication phase - reuse ongoing requests for same key
      if (deduplicate) {
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
      setCacheData(cacheKey, result, cacheTime);

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
    cacheMap.delete(untracked(resolveKey));
    run(true);
  }

  // Initialize effect system with optional auto-fetching
  cleanupEffect?.();
  cleanupEffect = effect(() => {
    if (auto && enabled) {
      resolveKey(); // Track key reactively
      run(false); // Auto-fetch on key change
    }
  });

  /**
   * Computed status based on current loading, error, and data states
   */
  const status = () => {
    if (loading()) return "loading";
    if (error()) return "error";

    const currentData = data();
    // Check if we're still in initial state
    if (currentData === options.initialData) return "idle";
    if (currentData !== undefined) return "success";
    return "idle";
  };

  const cacheKey = () => untracked(resolveKey);

  /**
   * Sets the resource data to a new value or updates it using a function.
   * @param updater - New data or updater function to modify existing cached data
   */
  const setData = (updater: T | ((old: T | undefined) => T)) => {
    const key = cacheKey();

    if (typeof updater === 'function') {
      if (!updateCacheData(key, updater as (old: T | undefined) => T) && cacheTime) {
        const newData = (updater as (old: T | undefined) => T)(undefined);
        setCacheData(key, newData, cacheTime);
      }
    } else {
      cacheTime && setCacheData(key, updater, cacheTime);
    }
  };

  const mutate = async <TVariables = any>(variables: TVariables): Promise<T> => {
    currentAbortController = cleanAbort();
    const signal = currentAbortController.signal;

    if (timeout && timeout > 0) {
      const timeoutId = setTimeout(() => currentAbortController!.abort(), timeout);
      signal.addEventListener('abort', () => clearTimeout(timeoutId));
    }

    if (abortSignal)
      abortSignal.aborted
        ? currentAbortController.abort()
        : abortSignal.addEventListener('abort', () => currentAbortController!.abort());

    try {
      loading(true);
      handleError();

      if (options.onMutate)
        mutationContext = await options.onMutate(variables);

      const result = await Promise.race([
        (fetcher as any)(variables),
        new Promise<never>((_, reject) => {
          const onAbort = () => reject(new DOMException('Mutation was aborted', 'AbortError'));
          signal.aborted ? onAbort() : signal.addEventListener('abort', onAbort);
        })
      ]);

      if (!signal.aborted) {
        handleSuccess(result);
        await options.onSettled?.(result, undefined, variables, mutationContext);
        return result;
      }

      throw new DOMException('Mutation was aborted', 'AbortError');
    } catch (err) {
      if (!signal.aborted) {
        handleSuccessError(err);
        await options.onSettled?.(undefined, err, variables, mutationContext);
      }

      throw err;
    } finally {
      signal.aborted && loading(false);
    }
  };

  const reset = () => {
    data(options.initialData);
    handleError();
    mutationContext = undefined;
  };

  return {
    data: computed(() => data()),
    error: computed(() => error()),
    loading: computed(() => loading()),
    status: computed(() => status()),
    fetch: () => run(false),
    get: () => run(false),
    request: () => run(true),
    abort,
    invalidate,
    setData,
    cacheKey,
    mutate,
    reset,
  };
}

/**
 * Categorizes errors into structured ResourceError format.
 * @param error - Raw error from fetch or other operations
 * @returns Categorized error with message, category, and optional status code
 */
export function categorizeError(error: unknown): ResourceError {
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
