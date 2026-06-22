## [ ] Cache Observability
**Type:** Code

### Depends On
- None

### Objective

Two new methods on `resourceCache`: `isFetching(key)` returns whether a request for the given key is currently in-flight across any fetcher scope; `getEntryMeta(key)` returns cache entry metadata (`timestamp`, `staleTime`, `cacheTime`, `lastAccess`) or `undefined`.

### Solution

**Files touched:**
- `packages/resource/lib/cache.ts` — add `isFetching` and `getEntryMeta` to the `resourceCache` object
- `packages/resource/lib/internal/dedupe.ts` — add a public `isOngoing(fetcher, key)` helper (or cross-scope lookup)
- `packages/resource/lib/types/cache.d.ts` — extend `ResourceCache` interface with the two new methods; add a `CacheEntryMeta` type

**Strategy:**

1. **`resourceCache.isFetching(key)`** — Iterates all scopes in the dedup `WeakMap` (same pattern as the cache flat view) looking for an `OngoingRequest` with a matching key. Returns `true` if any ongoing request exists for that key in any fetcher scope. Implementation: add a module-level function in `dedupe.ts` that wraps the inner WeakMap query, then call it from `cache.ts`.

2. **`resourceCache.getEntryMeta(key)`** — Iterates all cache scopes (same pattern as `flatView.get`) and returns an object with `{ timestamp, staleTime, cacheTime, lastAccess }` for the first non-expired match, or `undefined` if none found. Does NOT include the cached `data` value — metadata only.

3. Both methods use the existing cross-scope iteration pattern from `flatView.get` / `flatView.has`.

**Key decisions:**
- `isFetching` searches across ALL fetcher scopes (consistent with `resourceCache.get`, `invalidate`, etc.). If a user needs per-fetcher granularity, they can access the dedup map indirectly through the resource's cacheKey.
- `getEntryMeta` returns `undefined` for expired entries (consistent with `getCacheData` behavior).
- Types: add `CacheEntryMeta` interface with `{ readonly timestamp: number; readonly staleTime: number; readonly cacheTime: number; readonly lastAccess: number; }`.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — existing `resourceCache` API unchanged
- [ ] `resourceCache.isFetching("key")` returns `true` when a request for that key is in-flight
- [ ] `resourceCache.isFetching("key")` returns `false` when no request for that key is in-flight
- [ ] `resourceCache.getEntryMeta("key")` returns metadata for a cached non-expired entry
- [ ] `resourceCache.getEntryMeta("key")` returns `undefined` for a missing or expired entry
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
