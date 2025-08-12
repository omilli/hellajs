import { signal, computed, effect, untracked } from "@hellajs/core";
import type { CacheEntry, ResourceOptions, Resource } from "./types";

const cacheMap = new Map<unknown, CacheEntry<unknown>>();

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
      (key: string) => fetch(key).then(r => r.json()),
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

  let cleanupEffect: (() => void) | undefined;
  let aborted = false;

  function getCache(key: K): T | undefined {
    if (!cacheTime) return undefined;
    const entry = cacheMap.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < cacheTime) {
      return entry.data;
    }
    return undefined;
  }

  function setCache(key: K, value: T) {
    if (!cacheTime) return;
    cacheMap.set(key, { data: value, timestamp: Date.now() } as CacheEntry<T>);
  }

  async function run(force = false) {
    if (!enabled) return;
    const key = untracked(keyFn);
    if (!force) {
      const cached = getCache(key);
      if (cached !== undefined) {
        if (!aborted) {
          data(cached);
          error(undefined);
          loading(false);
        }
        return;
      }
    }
    loading(true);
    error(undefined);
    try {
      const result = await fetcher(key);
      setCache(key, result);
      if (!aborted) {
        data(result);
        loading(false);
        options.onSuccess?.(result);
      }
    } catch (err) {
      if (!aborted) {
        error(err);
        loading(false);
        options.onError?.(err);
      }
    }
  }

  function cache() {
    aborted = false;
    run(false);
  }

  function request() {
    aborted = false;
    run(true);
  }

  function abort() {
    aborted = true;
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
    if (data() === options.initialData) return "idle";
    if (data() !== undefined) return "success";
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
