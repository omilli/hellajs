import { signal, computed, effect, untracked } from "@hellajs/core";
import type { ResourceOptions, Resource, ResourceError, Fetcher } from "./types";
import { cacheMap, cleanupExpiredCache, setCacheData, getCacheData, isStale } from "./cache";
import type { CacheEntry } from "./types";

/** Map tracking ongoing requests to prevent duplicate network calls */
export const ongoingRequestsMap = new Map();

/**
 * Creates a reactive resource for data fetching with string URL.
 * Provides cache-first fetching, manual control, and reactive state management.
 * @template T - The expected data type
 * @template TTransformed - The transformed data type after transform
 * @param url - The URL endpoint to fetch from
 * @param options - Configuration options for the resource
 * @returns A resource object with reactive state and control methods
 */
export function resource<T = unknown, TTransformed = T>(
  url: string,
  options?: ResourceOptions<T, string, TTransformed>
): Resource<TTransformed, T>;

/**
 * Creates a reactive resource for data fetching with custom fetcher.
 * Provides cache-first fetching, manual control, and reactive state management.
 * @template T - The expected data type
 * @template K - The cache key type
 * @template TTransformed - The transformed data type after transform
 * @param fetcher - Custom async function that performs the data fetching
 * @param options - Configuration options for the resource
 * @returns A resource object with reactive state and control methods
 */
export function resource<T, K = undefined, TTransformed = T>(
  fetcher: Fetcher<T, K>,
  options?: ResourceOptions<T, K, TTransformed>
): Resource<TTransformed, T>;

export function resource<T, K = undefined, TTransformed = T>(
  fetcher: Fetcher<T, K> | string,
  options: ResourceOptions<T, K, TTransformed> = {}
): Resource<TTransformed, T> {
  if (typeof fetcher === "string")
    return resource<T, string, TTransformed>(
      async (key: string) => {
        const { ok, status, statusText, json } = await fetch(key);
        if (!ok) throw new Error(`HTTP ${status}: ${statusText}`);
        return json();
      },
      { ...options, key: fetcher } as unknown as ResourceOptions<T, string, TTransformed>
    );

  const rawData = signal<T | undefined>(options.initialData);
  const transformFn = options.transform;
  const data = transformFn
    ? computed(() => {
      const current = rawData();
      return current === undefined ? undefined : transformFn(current);
    })
    : computed(() => rawData() as unknown as TTransformed);

  const error = signal<ResourceError | undefined>(undefined);
  const isLoading = signal(false);
  const isFetching = signal(false);
  const {
    enabled = true,
    auto = false,
    deduplicate = true,
    cacheTime = 0,
    staleTime,
    revalidateOnStale = true,
    timeout,
    abortSignal,
    retry = 0,
    retryDelay = 1000,
    refetchInterval,
    refetchIntervalInBackground = false,
    refetchOnWindowFocus = false,
    key = (() => undefined as unknown as K)
  } = options;

  /**
   * Resolves the key value, handling both function and static value cases
   */
  const resolveKey = () => typeof key === 'function' ? (key as () => K)() : key;

  /**
   * Handles error state updates with optional loading/fetching state
   */
  const handleError = (err?: unknown, load?: boolean, fetching?: boolean) => {
    error(err ? categorizeError(err) : undefined);
    isLoading(load ?? false);
    isFetching(fetching ?? false);
    options.onError?.(err);
  }

  /**
   * Handles success/abort scenarios with special abort error handling
   */
  const handleSuccessError = (err?: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') {
      isLoading(false);
      isFetching(false);
    } else {
      handleError(err);
    }
  };

  /**
   * Handles successful data retrieval
   */
  const handleSuccess = (result: T) => {
    rawData(result);
    isLoading(false);
    isFetching(false);
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
  let retryCount = 0;
  let pollingCleanup: (() => void) | undefined;
  let focusCleanup: (() => void) | undefined;

  const resolveRetryConfig = () => {
    const maxRetries = typeof retry === 'boolean'
      ? (retry ? 1 : 0)
      : (typeof retry === 'number' ? retry : 0);
    return {
      maxRetries,
      shouldRetry: typeof retry === 'function'
        ? retry
        : (count: number) => count <= maxRetries,
      getDelay: typeof retryDelay === 'function'
        ? retryDelay
        : () => retryDelay
    };
  };

  const clearPolling = () => {
    pollingCleanup?.();
    pollingCleanup = undefined;
  };

  const setupPolling = () => {
    clearPolling();

    // Skip if no interval configured
    if (refetchInterval === undefined || refetchInterval === false || refetchInterval === 0) return;

    // Check document visibility support
    const hasDocument = typeof document !== 'undefined';
    let stopped = false;

    const executePoll = () => {
      // Skip if tab hidden and background polling disabled
      if (!refetchIntervalInBackground && hasDocument && document.visibilityState === 'hidden') return;
      run(false);
    };

    const scheduleNext = (interval: number) => {
      if (stopped) return;

      const timeoutId = setTimeout(() => {
        executePoll();
        // Get next interval (dynamic or fixed)
        const nextInterval = typeof refetchInterval === 'function'
          ? refetchInterval(untracked(data))
          : (refetchInterval as number);
        if (nextInterval && nextInterval > 0) {
          scheduleNext(nextInterval);
        }
      }, interval);

      // Store cleanup that also clears the pending timeout
      const prevCleanup = pollingCleanup;
      pollingCleanup = () => {
        stopped = true;
        clearTimeout(timeoutId);
        prevCleanup?.();
      };
    };

    // Get initial interval
    const initialInterval = typeof refetchInterval === 'function'
      ? refetchInterval(undefined)
      : (refetchInterval as number);

    if (initialInterval && initialInterval > 0) {
      scheduleNext(initialInterval);
    }
  };

  const clearFocus = () => {
    focusCleanup?.();
    focusCleanup = undefined;
  };

  const setupFocus = () => {
    clearFocus();

    if (!refetchOnWindowFocus) return;

    const hasDocument = typeof document !== 'undefined';
    if (!hasDocument) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        run(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    focusCleanup = () => document.removeEventListener('visibilitychange', handleVisibility);
  };

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
        const entry = cacheMap.get(cacheKey) as CacheEntry<T> | undefined;

        if (entry && Date.now() - entry.timestamp < entry.cacheTime) {
          // Update last access
          entry.lastAccess = Date.now();
          rawData(entry.data);
          handleError();

          // SWR: Only when staleTime is explicitly configured and triggers background refetch
          if (staleTime !== undefined && isStale(entry) && revalidateOnStale) {
            // Mark fetching before background fetch
            isFetching(true);
            // Don't await - background fetch
            run(true);
          }

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
          // isLoading only true if no data at all, isFetching always true
          const hasData = untracked(rawData) !== undefined;
          handleError(undefined, !hasData, true);
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
    // isLoading only true if no data at all, isFetching always true
    const hasData = untracked(rawData) !== undefined;
    handleError(undefined, !hasData, true);

    // Reset retry count for each new request
    retryCount = 0;

    // Register this request for deduplication before starting
    let resolvePromise: (value: T) => void;
    let rejectPromise: (error: unknown) => void;
    const requestPromise = new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    if (deduplicate) {
      ongoingRequestsMap.set(cacheKey, {
        promise: requestPromise,
        abortController: currentAbortController,
        subscribers: new Set()
      });
      // Silently handle rejection when no one is awaiting
      // This prevents unhandled promise rejection errors
      requestPromise.catch(() => { });
    }

    const retryConfig = resolveRetryConfig();

    // Retry loop
    while (true) {
      // Check for abort before each attempt
      if (currentSignal.aborted) {
        handleSuccessError(new DOMException('Request was aborted', 'AbortError'));
        return;
      }

      try {
        const result = await Promise.race([
          (fetcher as Fetcher<T, K>)(cacheKey),
          new Promise<never>((_, reject) => {
            const onAbort = () => reject(new DOMException('Request was aborted', 'AbortError'));
            currentSignal.aborted ? onAbort() : currentSignal.addEventListener('abort', onAbort, { once: true });
          })
        ]);

        setCacheData(cacheKey, result, cacheTime, staleTime ?? Infinity);
        !currentSignal.aborted && handleSuccess(result);
        retryCount = 0; // Reset retry count on success

        // Resolve deduplication promise and clean up
        resolvePromise!(result);
        deduplicate && ongoingRequestsMap.delete(cacheKey);
        return;
      } catch (err) {
        // Don't retry on abort
        if (err instanceof DOMException && err.name === 'AbortError') {
          handleSuccessError(err);
          // Reject deduplication promise and clean up
          rejectPromise!(err);
          deduplicate && ongoingRequestsMap.delete(cacheKey);
          return;
        }

        retryCount++;
        const categorizedError = categorizeError(err);

        // Check if we should retry
        if (!retryConfig.shouldRetry(retryCount, categorizedError)) {
          handleSuccessError(err);
          // Reject deduplication promise and clean up
          rejectPromise!(err);
          deduplicate && ongoingRequestsMap.delete(cacheKey);
          return;
        }

        // Wait for delay before next attempt
        const delayMs = retryConfig.getDelay(retryCount, categorizedError);
        await new Promise<void>(resolve => {
          const timeoutId = setTimeout(() => resolve(), delayMs);
          // Clean up timeout if aborted during delay
          currentSignal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            resolve();
          }, { once: true });
        });

        // Check for abort after delay
        if (currentSignal.aborted) {
          handleSuccessError(new DOMException('Request was aborted', 'AbortError'));
          // Reject deduplication promise and clean up
          rejectPromise!(new DOMException('Request was aborted', 'AbortError'));
          deduplicate && ongoingRequestsMap.delete(cacheKey);
          return;
        }
      }
    }
  }

  /**
   * Aborts current request and resets resource to initial state
   */
  function abort() {
    clearPolling();
    clearFocus();
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = undefined;
    }
    rawData(options.initialData);
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

  // Set up polling synchronously during initialization
  if (auto && enabled && refetchInterval) {
    setupPolling();
  }

  // Set up focus listener synchronously during initialization
  if (refetchOnWindowFocus) {
    setupFocus();
  }

  /**
   * Computed status based on current isLoading, error, and data states
   */
  const status = () => {
    if (isLoading()) return "loading";
    if (error()) return "error";

    const currentData = rawData();
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
      // Get old value from cache first, fallback to current rawData
      const cachedOld = cacheTime ? getCacheData(key) as T | undefined : undefined;
      const oldValue = cachedOld !== undefined ? cachedOld : rawData();
      const newData = (updater as (old: T | undefined) => T)(oldValue);
      rawData(newData);
      cacheTime && setCacheData(key, newData, cacheTime, staleTime ?? Infinity);
    } else {
      rawData(updater);
      cacheTime && setCacheData(key, updater, cacheTime, staleTime ?? Infinity);
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
      isLoading(true);
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
      signal.aborted && isLoading(false);
    }
  };

  const reset = () => {
    clearPolling();
    clearFocus();
    rawData(options.initialData);
    handleError();
    mutationContext = undefined;
  };

  const isIdle = () => status() === 'idle';

  const dispose = () => {
    clearPolling();
    clearFocus();
    cleanupEffect?.();
  };

  return {
    data,
    error: computed(() => error()),
    isLoading: computed(() => isLoading()),
    isFetching: computed(() => isFetching()),
    isIdle,
    status: computed(() => status()),
    get: () => run(false),
    request: () => run(true),
    abort,
    invalidate,
    setData,
    cacheKey,
    mutate,
    reset,
    dispose,
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
