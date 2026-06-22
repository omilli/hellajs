## [ ] Prefetch API
**Type:** Code

### Depends On
- None

### Objective

New `resourceCache.prefetch(options)` method that fetches data via a fetcher function and populates the cache, without creating a resource instance. Accepts a single options argument with `fetcher`, `key`, and optional `cacheTime`, `staleTime`, `timeout`, `abortSignal`, `retry`, `retryDelay`, `deduplicate`.

### Solution

**Files touched:**
- `packages/resource/lib/cache.ts` — add `prefetch` method to the `resourceCache` object
- `packages/resource/lib/types/cache.d.ts` — extend `ResourceCache` interface with `prefetch`; add `PrefetchOptions` interface
- `packages/resource/lib/resource.ts` — may extract the standalone fetch/cache/dedup logic or reuse it from `cache.ts`

**Strategy:**

1. Add `PrefetchOptions` interface:
```typescript
interface PrefetchOptions<T, K> {
  fetcher: (key: K) => Promise<T>;
  key: K;
  cacheTime?: number;
  staleTime?: number;
  timeout?: number;
  abortSignal?: AbortSignal;
  retry?: number | boolean | ((failureCount: number, error: ResourceError) => boolean);
  retryDelay?: number | ((attempt: number, error: ResourceError) => number);
  deduplicate?: boolean;
}
```

2. Implement `prefetch` on `resourceCache`:
   - Resolves the key.
   - Checks dedup map (if `deduplicate` is not `false`): if an in-flight request exists for this fetcher + key, await it and cache the result.
   - Otherwise, creates an `AbortController`, registers in the dedup map, runs the fetcher with abort/timeout/retry (same pattern as `run()` in `resource.ts`), stores the result via `setCacheData`, resolves the dedup promise, and returns the data.
   - Returns `Promise<T>` that resolves with the fetched (and cached) data.

3. Dry-run pattern: the fetcher/cache/retry/dedup logic is already implemented in `resource.ts`'s `run()` function. Rather than duplicating it, extract the reusable orchestration into a shared helper in `cache.ts` (or a new `internal/fetch.ts`) that both `resource.ts:run()` and `resourceCache.prefetch()` call. The URL string overload is not included in the initial version — users pass an explicit fetcher function.

**Key decisions:**
- Single options-object argument for extensibility.
- No resource object is created — `prefetch` is a fire-and-forget utility. The caller gets back a `Promise<T>`.
- Reuses existing dedup, cache, retry, and abort infrastructure. The primary work is extracting the reusable fetch pipeline from `resource.ts`.
- URL overload (string → built-in fetch) is deferred to a future iteration.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — `resourceCache` API extension, no existing changed
- [ ] `resourceCache.prefetch({ fetcher, key, cacheTime: 60000 })` fetches data and stores it in cache
- [ ] Subsequent `resource()` fetch with same fetcher + key hits the prefetched cache entry
- [ ] Deduplication works: two concurrent `prefetch` calls with same fetcher + key share one network request
- [ ] `prefetch` respects `timeout`, `abortSignal`, `retry` options
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
