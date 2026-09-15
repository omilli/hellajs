/**
 * Request deduplication map and accessors, keyed by fetcher then cache key.
 *
 * The outer container is a WeakMap keyed by fetcher function so entries are
 * reclaimed when a fetcher is garbage-collected. The inner map stays a strong
 * Map since inner keys can be primitives. WeakMap has no .clear(); a future
 * full reset must reassign a new instance rather than iterate.
 */

/**
 * An in-flight request shared between deduplicated callers.
 * @internal
 */
export interface OngoingRequest {
  promise: Promise<unknown>;
  abortController: AbortController;
}

/** Nested WeakMap tracking ongoing requests keyed by fetcher then cache key to prevent cross-fetcher collisions. */
let ongoingRequestsMap = new WeakMap<object, Map<unknown, OngoingRequest>>();

/**
 * @internal
 * Resets the deduplication map, releasing all in-flight request registrations.
 * Since WeakMap has no .clear(), a new instance is assigned.
 */
export function resetDedupe() {
  ongoingRequestsMap = new WeakMap();
}

/**
 * @internal
 * Gets the ongoing (in-flight) request for a fetcher + cache key, if one exists.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @returns The ongoing request, or undefined if none exists
 */
export function getOngoing(fetcher: object, cacheKey: unknown): OngoingRequest | undefined {
  return ongoingRequestsMap.get(fetcher)?.get(cacheKey);
}

/**
 * @internal
 * Registers an ongoing request for a fetcher + cache key so concurrent callers can deduplicate against it.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @param request - The in-flight request to share
 */
export function setOngoing(fetcher: object, cacheKey: unknown, request: OngoingRequest): void {
  let fetcherMap = ongoingRequestsMap.get(fetcher);
  if (!fetcherMap) {
    fetcherMap = new Map();
    ongoingRequestsMap.set(fetcher, fetcherMap);
  }
  fetcherMap.set(cacheKey, request);
}

/**
 * @internal
 * Removes the ongoing request entry for a fetcher + cache key only when the
 * registered entry is still the given request — a superseding registration
 * (e.g. a force fetch overwriting the slot) is left intact.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @param request - The in-flight request expected to still be registered
 */
export function deleteOngoingIf(fetcher: object, cacheKey: unknown, request: OngoingRequest): void {
  const fetcherMap = ongoingRequestsMap.get(fetcher);
  if (fetcherMap?.get(cacheKey) === request) fetcherMap.delete(cacheKey);
}
