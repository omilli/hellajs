import { signal, computed, effect, untracked, isFunction, hasWindow } from "./internal/core";
import type { ResourceOptions, Resource, ResourceError, Fetcher, FetchOptions } from "./types/resource";
import type { CacheEntry } from "./types/cache";
import { cacheMap, cleanupExpiredCache, setCacheData, getCacheData, isStale, resourceCache } from "./cache";
import { isAbortError, categorizeError } from "./internal/errors";
import { resolveRetryConfig, fetchWithRetry } from "./internal/retry";
import { wireRequestControls } from "./internal/abort";
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
 * @throws {Error} When fetcher is not a string URL or function, or options is not an object.
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
 * @throws {Error} When fetcher is not a string URL or function, or options is not an object.
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
  if (options !== undefined && (options === null || typeof options !== "object" || Array.isArray(options)))
    throw new Error("[resource] resource: options must be an object, received " + options);

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
    keepPreviousData = true,
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
    invalidates,
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
    if (err) options.onError?.(err);
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

  /** Settles the deferred promise and cleans up dedup registration. */
  const settleRun = <R>(
    settle: (value: R) => void,
    value: R,
    cacheKey: unknown
  ) => {
    settle(value);
    deduplicate && deleteOngoing(fetcherFn, cacheKey);
  };

  // eslint-disable-next-line prefer-const
  let cleanupEffect: (() => void) | undefined;
  let currentAbortController: AbortController | undefined;
  /** Live mutation controllers — one per in-flight `mutate()`, self-removed on settle. */
  let mutationControllers: Set<AbortController> | undefined;

  const polling = createPolling<TTransformed>({ refetchInterval, refetchIntervalInBackground, data, run });
  const focus = createFocus(run);
  const reconnect = createReconnect(run);

  /**
   * Core fetch logic with caching, deduplication, and abort handling.
   * @param force - When true, bypasses cache and deduplication
   * @param manual - When true, bypasses reactive enabled checks (manual fetch)
   * @returns Promise resolving with the data on cache hit (including SWR-stale), dedup join, or network success; `undefined` on error, skip, SSR, or abort-supersede. Never rejects — errors surface via `error()`/`onError`.
   */
  async function run(force = false, manual = false) {
    if (!hasWindow()) return;
    if (!untracked(isEnabled) && !(manual && enabledIsFn)) return;

    const cacheKey = untracked(resolveKey);

    // Cache check phase - skip if force refresh requested
    if (!force) {
      if (cacheTime) {
        cleanupExpiredCache();
        const entry = cacheMap.get(fetcherFn)?.get(cacheKey) as CacheEntry<T> | undefined;

        if (entry && Date.now() - entry.timestamp < entry.cacheTime) {
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

          return entry.data;
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
            if (!abortController.signal.aborted) {
              const shared = await promise;
              handleSuccess(shared);
              return shared;
            }
          } catch (err) {
            handleSuccessError(err);
          }
          return;
        }
      }
    }

    // Request initiation phase - setup abort controls and timeouts
    currentAbortController = cleanAbort();
    const releaseControls = wireRequestControls(currentAbortController, { timeout, abortSignal });

    const currentSignal = currentAbortController.signal;
    // isLoading only true if no data at all, isFetching always true
    const hasData = untracked(rawData) !== undefined;
    handleError(undefined, !hasData, true);

    const retryConfig = resolveRetryConfig(retry, retryDelay);

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

    // Request loop shared with prefetch; post-processing order preserved.
    try {
      const result = await fetchWithRetry(() => fetcherFn(cacheKey), { signal: currentSignal, retryConfig });

      const shared = structuralSharing ? structuralShare<T>(untracked(() => rawData()), result) : result;
      setCacheData(fetcherFn, cacheKey, shared, cacheTime, staleTime ?? Infinity);
      !currentSignal.aborted && handleSuccess(shared);
      settleRun(resolvePromise!, shared, cacheKey);
      // Superseded-by-abort fetches never applied the data — resolve without it
      return currentSignal.aborted ? undefined : shared;
    } catch (err) {
      handleSuccessError(err);
      settleRun(rejectPromise!, err, cacheKey);
    } finally {
      releaseControls();
    }
  }

  /**
   * Aborts current request and resets resource to initial state.
   * Polling stops permanently — unlike reset(), it does not re-arm;
   * recreate the resource to resume polling.
   */
  function abort() {
    polling.clear();
    focus.clear();
    reconnect.clear();
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = undefined;
    }
    mutationControllers?.forEach((controller) => controller.abort());
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
  const hasExplicitKey = Object.hasOwn(options, "key");

  // Polling arms on (refetchInterval, enabled) alone — independent of auto-fetch.
  // Arms once: at creation when enabled, or on the first truthy enabled evaluation
  // inside the effect. Key changes never reset the cadence; reset() re-arms, abort() does not.
  let pollingArmed = false;

  // Key-change tracking for keepPreviousData:false — updated on every key
  // evaluation inside the effect; enabled flips re-run with an unchanged key.
  let hasPrevKey = false;
  let prevKey: K | undefined;

  /** Arms the polling timer once, keyed on refetchInterval and enabled alone. */
  const armPolling = () => {
    if (refetchInterval && !pollingArmed) {
      pollingArmed = true;
      polling.setup();
    }
  };

  cleanupEffect?.();
  cleanupEffect = effect(() => {
    if (isEnabled()) {
      armPolling();
      if (refetchOnKeyChange) {
        const keyVal = resolveKey(); // Track key reactively
        const keyChanged = hasPrevKey && keyVal !== prevKey;
        prevKey = keyVal;
        hasPrevKey = true;
        if (!hasExplicitKey || keyVal != null) {
          // A key change with keepPreviousData:false is a fresh load — the old
          // key's data no longer describes the resource
          if (keyChanged && !keepPreviousData) rawData(undefined);
          run(false); // Auto-fetch on key change
        }
      }
    }
  });

  // Set up polling synchronously during initialization
  if (untracked(isEnabled)) armPolling();

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

  /** Gets the current cache key without creating a reactive dependency. */
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
   * Executes a mutation against the resource's fetcher with abort, timeout, and retry support.
   * Invokes onMutate, onSuccess/onError, and onSettled hooks; bypasses cache and deduplication.
   * Concurrent mutations run independently — each call owns its abort controller and its
   * onMutate context; only `abort()` (or per-call timeout/abortSignal) cancels it.
   * @param variables - Argument passed to the fetcher for the mutation
   * @returns The raw fetcher result on success
   */
  const mutate = async <TVariables = unknown>(variables: TVariables): Promise<T> => {
    const controller = new AbortController();
    (mutationControllers ??= new Set()).add(controller);
    const releaseControls = wireRequestControls(controller, { timeout, abortSignal });
    const signal = controller.signal;
    const retryConfig = resolveRetryConfig(retry, retryDelay);
    // Per-call rollback context: concurrent mutations never see each other's snapshots
    let ctx: unknown;

    try {
      const hasData = untracked(rawData) !== undefined;
      handleError(undefined, !hasData, true);

      ctx = options.onMutate ? await options.onMutate(variables) : undefined;

      const result = await fetchWithRetry(
        () => (fetcherFn as unknown as (vars: TVariables) => Promise<T>)(variables),
        { signal, retryConfig }
      );

      if (!signal.aborted) {
        handleSuccess(result);
        await options.onSettled?.(result, undefined, variables, ctx);
        if (invalidates) {
          let i = 0;
          const len = invalidates.length;
          while (i < len) {
            const item = invalidates[i++]!;
            if (typeof item === "string") {
              resourceCache.invalidateByPrefix(item);
            } else {
              resourceCache.invalidateByPattern(item);
            }
          }
        }
        return result;
      }

      throw new DOMException("Mutation was aborted", "AbortError");
    } catch (err) {
      if (!signal.aborted) {
        handleSuccessError(err);
        await options.onSettled?.(undefined, err, variables, ctx);
      }

      throw err;
    } finally {
      // Abort path never reaches handleSuccessError (the catch guards on !signal.aborted),
      // so clear both activity flags here; error stays unset for AbortError.
      if (signal.aborted) {
        isLoading(false);
        isFetching(false);
      }
      mutationControllers?.delete(controller);
      releaseControls();
    }
  };

  /**
   * Returns the resource to its initial state. Reusable after calling.
   * Resets data to initialData and clears error state; focus/reconnect listeners are cleared.
   * Polling restarts at its interval (abort() stops it permanently; recreate to resume).
   */
  const reset = () => {
    polling.clear();
    focus.clear();
    reconnect.clear();
    pollingArmed = false;
    armPolling();
    rawData(options.initialData);
    handleError();
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
