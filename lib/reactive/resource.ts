import { signal, computed, batch, effect, untracked } from ".";
import type { CacheEntry, ResourceOptions, ResourceReturn, ResourceStatus } from "../types";

const cacheMap = new Map<unknown, CacheEntry<unknown>>();

export function resource<T, K = undefined>(
  fetcher: (key: K) => Promise<T>,
  options: ResourceOptions<T, K> = {}
): ResourceReturn<T> {
  const data = signal<T | undefined>(options.initialData);
  const error = signal<unknown>(undefined);
  const loading = signal(false);
  const status = signal<ResourceStatus>("idle");
  const enabled = options.enabled ?? true;
  const keyFn = options.key ?? (() => undefined as unknown as K);
  const cacheTime = options.cacheTime ?? 0;

  let currentRequest: Promise<T> | null = null;
  let abortController: AbortController | null = null;

  let cleanupEffects: (() => void)[] = [];

  function cleanupAllEffects() {
    for (const cleanup of cleanupEffects) cleanup();
    cleanupEffects = [];
  }

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
        batch(() => {
          data.set(cached);
          error.set(undefined);
          loading.set(false);
          status.set("success");
        });
        return;
      }
    }
    batch(() => {
      loading.set(true);
      status.set("loading");
      error.set(undefined);
    });
    abortController?.abort();
    abortController = new AbortController();
    try {
      const promise = fetcher(key);
      currentRequest = promise;
      const result = await promise;
      if (currentRequest === promise) {
        setCache(key, result);
        batch(() => {
          data.set(result);
          loading.set(false);
          status.set("success");
        });
        options.onSuccess?.(result);
      }
    } catch (err) {
      if (currentRequest) {
        batch(() => {
          error.set(err);
          loading.set(false);
          status.set("error");
        });
        options.onError?.(err);
      }
    }
  }

  function refetch() {
    run(true);
  }

  function reset() {
    cleanupAllEffects();
    batch(() => {
      data.set(options.initialData);
      error.set(undefined);
      loading.set(false);
      status.set("idle");
    });
  }

  function invalidate() {
    cacheMap.delete(untracked(keyFn));
    refetch();
  }

  function abort() {
    abortController?.abort();
    abortController = null;
    cleanupAllEffects();
    batch(() => {
      loading.set(false);
      status.set("idle");
    });
  }

  async function mutate(mutator: () => Promise<T>) {
    batch(() => {
      loading.set(true);
      status.set("loading");
      error.set(undefined);
    });
    try {
      const result = await mutator();
      setCache(untracked(keyFn), result);
      batch(() => {
        data.set(result);
        loading.set(false);
        status.set("success");
      });
      options.onSuccess?.(result);
    } catch (err) {
      batch(() => {
        error.set(err);
        loading.set(false);
        status.set("error");
      });
      options.onError?.(err);
    }
  }

  // Auto-fetch on creation and on key change
  cleanupEffects.push(
    effect(() => {
      if (enabled) run();
    })
  );

  return {
    data: computed(() => data()),
    error: computed(() => error()),
    loading: computed(() => loading()),
    status: computed(() => status()),
    refetch,
    reset,
    invalidate,
    abort,
    mutate,
  };
}
