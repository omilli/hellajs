import {
  createTimeout,
  delay,
  GenericPromise,
  isAbortError,
  isString,
  toError,
} from "../global";
import { REACTIVE_STATE } from "./global";
import { signal } from "./signal";
import {
  ResourceJSONArgs,
  ResourceOptions,
  ResourceRequestArgs,
  ResourceResult,
} from "./types";
import { ResourceCacheArgs, UpdateResourceCacheArgs } from "./types";

const { resourceCache, activeRequests } = REACTIVE_STATE;

/**
 * Core resource primitive with caching and retry logic
 */
export function resource<T>(
  input: string | GenericPromise<T>,
  options: ResourceOptions<T> = {}
): ResourceResult<T> {
  const state = resourceState<T>();
  const config = resourceConfig(options);
  const key = isString(input) ? input : input.toString();
  const controller = new AbortController();

  async function fetch(): Promise<void> {
    const cached = checkCache<T>({ key, maxAge: config.cacheTime });
    if (cached) {
      state.data.set(cached);
      return;
    }

    validatePoolSize(config.poolSize);

    state.loading.set(true);
    state.error.set(undefined);
    activeRequests.set(key, controller);

    try {
      const result = await executeRequest({
        input,
        options: config,
        signal: controller.signal,
      });
      const validated = validateResult(result, config);
      const transformed = config.transform(validated);

      updateCache({ key, data: transformed, shouldCache: config.cache });
      state.data.set(transformed);
    } catch (e) {
      if (isAbortError(e)) return;
      state.error.set(toError(e));
    } finally {
      state.loading.set(false);
      activeRequests.delete(key);
    }
  }

  return {
    ...state,
    fetch,
    abort: () => controller.abort(),
    refresh: () => {
      invalidateCache(key);
      return fetch();
    },
    invalidate: () => invalidateCache(key),
  };
}

/**
 * Resource state initialization
 */
function resourceState<T>() {
  return {
    data: signal<T | undefined>(undefined),
    loading: signal(false),
    error: signal<Error | undefined>(undefined),
  };
}

/**
 * Resource configuration with defaults
 */
function resourceConfig<T>(options: ResourceOptions<T>) {
  return {
    cache: true,
    cacheTime: 300000,
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    poolSize: 10,
    transform: (data: T) => data,
    validate: (_: T) => true,
    onError: (_: Response) => undefined,
    ...options,
  };
}

/**
 * Request execution with retries
 */
async function executeRequest<T>({
  input,
  options,
  signal,
}: ResourceRequestArgs<T>): Promise<T> {
  let error: Error | undefined;

  for (let attempt = 0; attempt < options.retries; attempt++) {
    try {
      const timeoutPromise = createTimeout(options.timeout);
      const fetchPromise = isString(input)
        ? fetchJSON({ url: input, onError: options.onError, signal })
        : input();

      return (await Promise.race([fetchPromise, timeoutPromise])) as T;
    } catch (e) {
      error = toError(e);
      if (isAbortError(e)) throw error;
      await delay(options.retryDelay * (attempt + 1));
    }
  }

  throw error ?? new Error("Request failed");
}

/**
 * JSON fetcher with error handling
 */
async function fetchJSON<T>({
  url,
  onError,
  signal,
}: ResourceJSONArgs): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    onError?.(response);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Cache management
 */
function checkCache<T>({ key, maxAge }: ResourceCacheArgs): T | undefined {
  const cached = resourceCache.get(key);
  if (!cached) return undefined;

  const isExpired = Date.now() - cached.timestamp > maxAge;
  isExpired && resourceCache.delete(key);
  return isExpired ? undefined : cached.data;
}

function updateCache({
  key,
  data,
  shouldCache,
}: UpdateResourceCacheArgs): void {
  shouldCache &&
    resourceCache.set(key, {
      data,
      timestamp: Date.now(),
    });
}

function invalidateCache(key: string): void {
  resourceCache.delete(key);
}

/**
 * Validation functions
 */

function validatePoolSize(limit: number): void {
  if (activeRequests.size >= limit) {
    throw new Error("Resource pool limit reached");
  }
}

function validateResult<T>(result: T, config: Required<ResourceOptions<T>>): T {
  // Handle null/undefined results
  if (result === null || result === undefined) {
    throw new Error("Resource returned no data");
  }

  // Run custom validation
  if (!config.validate(result)) {
    throw new Error("Resource validation failed");
  }

  return result;
}
