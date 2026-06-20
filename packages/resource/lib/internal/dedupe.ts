/**
 * Request deduplication map and accessors, keyed by fetcher then cache key.
 *
 * The outer container is a WeakMap keyed by fetcher function so entries are
 * reclaimed when a fetcher is garbage-collected. The inner map stays a strong
 * Map since inner keys can be primitives. WeakMap has no .clear(); a future
 * full reset must reassign a new instance rather than iterate.
 */

/** An in-flight request shared between deduplicated callers. */
interface OngoingRequest {
  promise: Promise<unknown>;
  abortController: AbortController;
}

/** Nested WeakMap tracking ongoing requests keyed by fetcher then cache key to prevent cross-fetcher collisions. */
const ongoingRequestsMap = new WeakMap<object, Map<unknown, OngoingRequest>>();

/**
 * @internal
 * Gets the ongoing (in-flight) request for a fetcher + cache key, if one exists.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @returns The ongoing request, or undefined if none exists
 */
export const getOngoing = (fetcher: object, cacheKey: unknown): OngoingRequest | undefined =>
  ongoingRequestsMap.get(fetcher)?.get(cacheKey);

/**
 * @internal
 * Registers an ongoing request for a fetcher + cache key so concurrent callers can deduplicate against it.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @param request - The in-flight request to share
 */
export const setOngoing = (fetcher: object, cacheKey: unknown, request: OngoingRequest): void => {
  let fetcherMap = ongoingRequestsMap.get(fetcher);
  if (!fetcherMap) {
    fetcherMap = new Map();
    ongoingRequestsMap.set(fetcher, fetcherMap);
  }
  fetcherMap.set(cacheKey, request);
};

/**
 * @internal
 * Removes the ongoing request entry for a fetcher + cache key.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 */
export const deleteOngoing = (fetcher: object, cacheKey: unknown): void => {
  ongoingRequestsMap.get(fetcher)?.delete(cacheKey);
};
