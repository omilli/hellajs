import { signal, computed, effect, untracked } from "@hellajs/core";
import type { CacheEntry, ResourceOptions, Resource } from "./types";

const cacheMap = new Map<unknown, CacheEntry<unknown>>();

export function resource<T = unknown>(
  url: string,
  options?: ResourceOptions<T, string>
): Resource<T>;

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
        data(cached);
        error(undefined);
        loading(false);
        return;
      }
    }
    loading(true);
    error(undefined);
    try {
      const result = await fetcher(key);
      setCache(key, result);
      data(result);
      loading(false);
      options.onSuccess?.(result);
    } catch (err) {
      error(err);
      loading(false);
      options.onError?.(err);
    }
  }

  function cache() {
    run(false);
  }

  function request() {
    run(true);
  }

  function abort() {
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