import { signal, computed, effect, untracked } from ".";
import type { CacheEntry, ResourceOptions, ResourceReturn } from "../types";

const cacheMap = new Map<unknown, CacheEntry<unknown>>();

export function resource<T = unknown>(
  url: string,
  options?: ResourceOptions<T, string>
): ResourceReturn<T>;

export function resource<T, K = undefined>(
  fetcher: (key: K) => Promise<T>,
  options?: ResourceOptions<T, K>
): ResourceReturn<T>;

export function resource<T, K = undefined>(
  fetcherOrUrl: ((key: K) => Promise<T>) | string,
  options: ResourceOptions<T, K> = {}
): ResourceReturn<T> {
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
        data.set(cached);
        error.set(undefined);
        loading.set(false);
        return;
      }
    }
    loading.set(true);
    error.set(undefined);
    try {
      const result = await fetcher(key);
      setCache(key, result);
      data.set(result);
      loading.set(false);
      options.onSuccess?.(result);
    } catch (err) {
      error.set(err);
      loading.set(false);
      options.onError?.(err);
    }
  }

  function refetch() {
    run(true);
  }

  function reset() {
    data.set(options.initialData);
    error.set(undefined);
    loading.set(false);
  }

  function invalidate() {
    cacheMap.delete(untracked(keyFn));
    refetch();
  }

  async function mutate(mutator: () => Promise<T>) {
    loading.set(true);
    error.set(undefined);
    try {
      const result = await mutator();
      setCache(untracked(keyFn), result);
      data.set(result);
      loading.set(false);
      options.onSuccess?.(result);
    } catch (err) {
      error.set(err);
      loading.set(false);
      options.onError?.(err);
    }
  }

  if (cleanupEffect) cleanupEffect();
  cleanupEffect = effect(() => {
    if (enabled) run();
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
    refetch,
    reset,
    invalidate,
    mutate,
  };
}