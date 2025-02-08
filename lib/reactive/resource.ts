import { REACTIVE_STATE } from "./global";
import { GenericPromise, isString } from "../global";
import { signal } from "./signal";
import { ResourceOptions, ResourceResult } from "./types";

const { resourceCache, activeRequests } = REACTIVE_STATE;

export function resource<T>(
  input: string | GenericPromise<T>,
  options: ResourceOptions<T> = {}
): ResourceResult<T> {
  const state = {
    data: signal<T | undefined>(undefined),
    loading: signal(false),
    error: signal<Error | undefined>(undefined),
  };

  const defaultOptions = {
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

  const requestKey = isString(input) ? input : input.toString();
  const controller = new AbortController();

  const fetch = async (): Promise<void> => {
    const cachedResult = checkCache<T>(requestKey, defaultOptions.cacheTime);
    if (cachedResult) {
      state.data.set(cachedResult);
      return;
    }

    if (activeRequests.size >= defaultOptions.poolSize) {
      throw new Error("Resource pool limit reached");
    }

    state.loading.set(true);
    state.error.set(undefined);
    activeRequests.set(requestKey, controller);

    try {
      const result = await executeRequest(
        input,
        defaultOptions,
        controller.signal
      );

      const validatedResult = validateResult(result, defaultOptions);
      const transformedResult =
        defaultOptions.transform?.(validatedResult) ?? validatedResult;

      updateCache(requestKey, transformedResult, defaultOptions.cache);
      state.data.set(transformedResult);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      state.error.set(e instanceof Error ? e : new Error(String(e)));
    } finally {
      state.loading.set(false);
      activeRequests.delete(requestKey);
    }
  };

  return {
    ...state,
    fetch,
    abort: () => controller.abort(),
    refresh: () => {
      invalidateCache(requestKey);
      return fetch();
    },
    invalidate: () => invalidateCache(requestKey),
  };
}

async function executeRequest<T>(
  input: string | GenericPromise<T>,
  options: Required<ResourceOptions<T>>,
  signal: AbortSignal
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < options.retries; attempt++) {
    try {
      const timeoutPromise = createTimeout(options.timeout);
      const result = (await Promise.race([
        isString(input)
          ? fetchJSON<T>(input, options.onError, signal)
          : input(),
        timeoutPromise,
      ])) as T;
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      await delay(options.retryDelay * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Request failed");
}

function validateResult<T>(result: T, options: ResourceOptions<T>): T {
  if (options.validate && !options.validate(result)) {
    throw new Error("Resource validation failed");
  }
  return result;
}

function checkCache<T>(key: string, maxAge: number): T | undefined {
  const cached = resourceCache.get(key);
  if (!cached) return undefined;

  const isExpired = Date.now() - cached.timestamp > maxAge;
  isExpired && resourceCache.delete(key);
  return isExpired ? undefined : cached.data;
}

function updateCache(key: string, data: any, shouldCache: boolean): void {
  shouldCache && resourceCache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(key: string): void {
  resourceCache.delete(key);
}

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), ms)
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON<T>(
  url: string,
  onError?: (response: Response) => void,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    onError?.(response);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
