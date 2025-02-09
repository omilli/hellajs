import { HELLA_RESOURCE } from "./resource.global";
import { ResourceCacheArgs, ResourceUpdateCacheArgs } from "./resource.types";

const { cache } = HELLA_RESOURCE;

export function checkCache<T>({
  key,
  maxAge,
}: ResourceCacheArgs): T | undefined {
  const cached = cache.get(key);
  if (!cached) return undefined;

  const isExpired = Date.now() - cached.timestamp > maxAge;
  isExpired && cache.delete(key);
  return isExpired ? undefined : cached.data;
}

export function updateCache({
  key,
  data,
  shouldCache,
}: ResourceUpdateCacheArgs): void {
  shouldCache &&
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
}

export function destroyCache(key: string): void {
  cache.delete(key);
}
