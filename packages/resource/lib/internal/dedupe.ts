/**
 * Request deduplication map and accessors, keyed by fetcher then cache key.
 */

/** An in-flight request shared between deduplicated callers. */
interface OngoingRequest {
  promise: Promise<unknown>;
  abortController: AbortController;
}

/** Nested map tracking ongoing requests keyed by fetcher then cache key to prevent cross-fetcher collisions. */
const ongoingRequestsMap = new Map<unknown, Map<unknown, OngoingRequest>>();

/**
 * @internal
 * Gets the ongoing (in-flight) request for a fetcher + cache key, if one exists.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @returns The ongoing request, or undefined if none exists
 */
export const getOngoing = (fetcher: unknown, cacheKey: unknown): OngoingRequest | undefined =>
  ongoingRequestsMap.get(fetcher)?.get(cacheKey);

/**
 * @internal
 * Registers an ongoing request for a fetcher + cache key so concurrent callers can deduplicate against it.
 * @param fetcher - The fetcher function identifying the cache scope
 * @param cacheKey - The cache key within the fetcher scope
 * @param request - The in-flight request to share
 */
export const setOngoing = (fetcher: unknown, cacheKey: unknown, request: OngoingRequest): void => {
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
export const deleteOngoing = (fetcher: unknown, cacheKey: unknown): void => {
  ongoingRequestsMap.get(fetcher)?.delete(cacheKey);
};
