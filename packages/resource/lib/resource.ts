import { signal, computed, effect, untracked, isFunction } from "./internal/core";
import type { ResourceOptions, Resource, ResourceError, Fetcher, FetchOptions } from "./types/resource";
import type { CacheEntry } from "./types/cache";
import { cacheMap, cleanupExpiredCache, setCacheData, getCacheData, isStale } from "./cache";
import { isAbortError, categorizeError } from "./internal/errors";
import { resolveRetryConfig } from "./internal/retry";
import { createPolling } from "./internal/polling";
import { createFocus, createReconnect } from "./internal/lifecycle";
import { getOngoing, setOngoing, deleteOngoing } from "./internal/dedupe";
import { structuralShare } from "./internal/structural";

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
  if (typeof fetcher !== "string" && typeof fetcher !== "function")
    throw new Error("[resource] resource: fetcher must be a string URL or function, received " + typeof fetcher);
  if (options != null && (typeof options !== "object" || Array.isArray(options)))
    throw new Error("[resource] resource: options must be an object, received " + typeof options);

  if (typeof fetcher === "string")
    return resource<T, string, TTransformed>(
      async (key: string) => {
        const { ok, status, statusText, json } = await fetch(key);
        if (!ok) throw new Error(`HTTP ${status}: ${statusText}`);
        return json();
      },
      { ...options, key: fetcher } as unknown as ResourceOptions<T, string, TTransformed>
    );

  // Always a function after the string overload; the const preserves the Fetcher
  // type across closures so it satisfies the dedupe WeakMap's object key.
  const fetcherFn: Fetcher<T, K> = fetcher;

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
    refetchOnKeyChange = false,
    deduplicate = true,
    structuralSharing = false,
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
    refetchOnReconnect = false,
    key = (() => undefined as unknown as K)
  } = options;

  /**
   * Resolves the key value, handling both function and static value cases
   */
  const resolveKey = () => isFunction(key) ? (key as () => K)() : key;

  const enabledIsFn = isFunction(enabled);
  /**
   * Resolves the enabled flag, evaluating the getter reactively when provided as a function
   */
  const isEnabled = () => enabledIsFn ? (enabled as () => boolean)() : enabled;

  /**
   * Handles error state updates with optional loading/fetching state
   */
  const handleError = (err?: unknown, loading?: boolean, fetching?: boolean) => {
    error(err ? categorizeError(err) : undefined);
    isLoading(loading ?? false);
    isFetching(fetching ?? false);
    options.onError?.(err);
  };

  /**
   * Handles success/abort scenarios with special abort error handling
   */
  const handleSuccessError = (err?: unknown) => {
    if (isAbortError(err)) {
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
  };

  /**
   * Cleans up current abort controller and returns new one
   */
  const cleanAbort = (controller?: AbortController) => {
    currentAbortController && currentAbortController.abort();
    return controller || new AbortController();
  };

  // eslint-disable-next-line prefer-const
  let cleanupEffect: (() => void) | undefined;
  let currentAbortController: AbortController | undefined;
  let mutationContext: unknown;
  let retryCount = 0;

  const polling = createPolling<TTransformed>({ refetchInterval, refetchIntervalInBackground, data, run });
  const focus = createFocus(refetchOnWindowFocus, run);
  const reconnect = createReconnect(refetchOnReconnect, run);

  /**
   * Core fetch logic with caching, deduplication, and abort handling.
   * @param force - When true, bypasses cache and deduplication
   * @param manual - When true, bypasses reactive enabled checks (manual fetch)
   */
  async function run(force = false, manual = false) {
    if (!untracked(isEnabled) && !(manual && enabledIsFn)) return;

    const cacheKey = untracked(resolveKey);

    // Cache check phase - skip if force refresh requested
    if (!force) {
      if (cacheTime) {
        cleanupExpiredCache();
        const entry = cacheMap.get(fetcherFn)?.get(cacheKey) as CacheEntry<T> | undefined;

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

      // Deduplication phase - reuse ongoing requests for same fetcher + key
      if (deduplicate) {
        const ongoing = getOngoing(fetcherFn, cacheKey) as {
          promise: Promise<T>;
          abortController: AbortController;
        } | undefined;

        if (ongoing) {
          const { promise, abortController } = ongoing;
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
      abortSignal.aborted ? currentAbortController.abort()
        : abortSignal.addEventListener("abort", () => currentAbortController!.abort(), { once: true });

    if (timeout && timeout > 0) {
      const timeoutId = setTimeout(() => currentAbortController!.abort(), timeout);
      // Clean timeout on abort to prevent memory leaks
      currentAbortController.signal.addEventListener("abort", () => clearTimeout(timeoutId));
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
      setOngoing(fetcherFn, cacheKey, {
        promise: requestPromise,
        abortController: currentAbortController,
      });
      // Silently handle rejection when no one is awaiting
      // This prevents unhandled promise rejection errors
      requestPromise.catch(() => { });
    }

    const retryConfig = resolveRetryConfig(retry, retryDelay);

    // Retry loop
    while (true) {
      // Check for abort before each attempt
      if (currentSignal.aborted) {
        handleSuccessError(new DOMException("Request was aborted", "AbortError"));
        return;
      }

      try {
        const result = await Promise.race([
          fetcherFn(cacheKey),
          new Promise<never>((_, reject) => {
            const onAbort = () => reject(new DOMException("Request was aborted", "AbortError"));
            currentSignal.aborted ? onAbort() : currentSignal.addEventListener("abort", onAbort, { once: true });
          })
        ]);

        const shared = structuralSharing ? structuralShare<T>(untracked(() => rawData()), result) : result;
        setCacheData(fetcherFn, cacheKey, shared, cacheTime, staleTime ?? Infinity);
        !currentSignal.aborted && handleSuccess(shared);
        retryCount = 0; // Reset retry count on success

        // Resolve deduplication promise and clean up
        resolvePromise!(shared);
        deduplicate && deleteOngoing(fetcherFn, cacheKey);
        return;
      } catch (err) {
        if (isAbortError(err)) {
          handleSuccessError(err);
          // Reject deduplication promise and clean up
          rejectPromise!(err);
          deduplicate && deleteOngoing(fetcherFn, cacheKey);
          return;
        }

        retryCount++;
        const categorizedError = categorizeError(err);

        // Check if we should retry
        if (!retryConfig.shouldRetry(retryCount, categorizedError)) {
          handleSuccessError(err);
          // Reject deduplication promise and clean up
          rejectPromise!(err);
          deduplicate && deleteOngoing(fetcherFn, cacheKey);
          return;
        }

        // Wait for delay before next attempt
        const delayMs = retryConfig.getDelay(retryCount, categorizedError);
        await new Promise<void>(resolve => {
          const timeoutId = setTimeout(() => resolve(), delayMs);
          // Clean up timeout if aborted during delay
          currentSignal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            resolve();
          }, { once: true });
        });

        // Check for abort after delay
        if (currentSignal.aborted) {
          handleSuccessError(new DOMException("Request was aborted", "AbortError"));
          // Reject deduplication promise and clean up
          rejectPromise!(new DOMException("Request was aborted", "AbortError"));
          deduplicate && deleteOngoing(fetcherFn, cacheKey);
          return;
        }
      }
    }
  }

  /**
   * Aborts current request and resets resource to initial state
   */
  function abort() {
    polling.clear();
    focus.clear();
    reconnect.clear();
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
    cacheMap.get(fetcherFn)?.delete(untracked(resolveKey));
    run(true);
  }

  // Initialize effect system with optional key-change refetching
  // When user provides an explicit key, skip fetches while it's null/undefined
  const hasExplicitKey = "key" in options;

  cleanupEffect?.();
  cleanupEffect = effect(() => {
    if (refetchOnKeyChange && isEnabled()) {
      const keyVal = resolveKey(); // Track key reactively
      if (!hasExplicitKey || keyVal != null) run(false); // Auto-fetch on key change
    }
  });

  // Set up polling synchronously during initialization
  if (refetchOnKeyChange && isEnabled() && refetchInterval) {
    polling.setup();
  }

  // Set up focus listener synchronously during initialization
  if (refetchOnWindowFocus) {
    focus.setup();
  }

  // Set up reconnect listener synchronously during initialization
  if (refetchOnReconnect) {
    reconnect.setup();
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
    if (updater === undefined) throw new Error("[resource] setData: updater is required, received undefined");
    const key = cacheKey();

    if (typeof updater === "function") {
      // Get old value from cache first, fallback to current rawData
      const cachedOld = cacheTime ? getCacheData(fetcherFn, key) as T | undefined : undefined;
      const oldValue = cachedOld !== undefined ? cachedOld : rawData();
      const newData = (updater as (old: T | undefined) => T)(oldValue);
      rawData(newData);
      cacheTime && setCacheData(fetcherFn, key, newData, cacheTime, staleTime ?? Infinity);
    } else {
      rawData(updater);
      cacheTime && setCacheData(fetcherFn, key, updater, cacheTime, staleTime ?? Infinity);
    }
  };

  /**
   * Executes a mutation against the resource's fetcher with abort and timeout support.
   * Invokes onMutate, onSuccess/onError, and onSettled hooks; bypasses cache and deduplication.
   * @param variables - Argument passed to the fetcher for the mutation
   * @returns The raw fetcher result on success
   */
  const mutate = async <TVariables = unknown>(variables: TVariables): Promise<T> => {
    currentAbortController = cleanAbort();
    const signal = currentAbortController.signal;

    if (timeout && timeout > 0) {
      const timeoutId = setTimeout(() => currentAbortController!.abort(), timeout);
      signal.addEventListener("abort", () => clearTimeout(timeoutId));
    }

    if (abortSignal)
      abortSignal.aborted
        ? currentAbortController.abort()
        : abortSignal.addEventListener("abort", () => currentAbortController!.abort(), { once: true });

    try {
      isLoading(true);
      handleError();

      if (options.onMutate)
        mutationContext = await options.onMutate(variables);

      const result = await Promise.race([
        (fetcherFn as unknown as (vars: TVariables) => Promise<T>)(variables),
        new Promise<never>((_, reject) => {
          const onAbort = () => reject(new DOMException("Mutation was aborted", "AbortError"));
          signal.aborted ? onAbort() : signal.addEventListener("abort", onAbort);
        })
      ]);

      if (!signal.aborted) {
        handleSuccess(result);
        await options.onSettled?.(result, undefined, variables, mutationContext);
        return result;
      }

      throw new DOMException("Mutation was aborted", "AbortError");
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

  /**
   * Returns the resource to its initial state. Reusable after calling.
   * Clears polling, focus, and reconnect listeners, resets data to initialData, and clears error state.
   */
  const reset = () => {
    polling.clear();
    focus.clear();
    reconnect.clear();
    rawData(options.initialData);
    handleError();
    mutationContext = undefined;
  };

  /** Returns true when the resource status is idle (never fetched or reset to initial state). */
  const isIdle = () => status() === "idle";

  /**
   * One-way teardown. The resource is dead after calling.
   * Clears all timers, listeners, and reactive effects. The resource cannot be reused.
   * Use reset() to return to initial state while keeping the resource usable.
   */
  const dispose = () => {
    polling.clear();
    focus.clear();
    reconnect.clear();
    cleanupEffect?.();
  };

  return {
    data,
    error: () => error(),
    isLoading: () => isLoading(),
    isFetching: () => isFetching(),
    isIdle,
    status,
    fetch: (options?: FetchOptions) => run(options?.force ?? false, true),
    abort,
    invalidate,
    setData,
    cacheKey,
    mutate,
    reset,
    dispose,
  };
}
