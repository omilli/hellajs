# [ ] cache-observability

## Contract

### Surface change
yes — adds two methods (`isFetching`, `getEntryMeta`) to `resourceCache`, which is re-exported by `packages/resource/lib/index.ts` (`export { resourceCache } from "./cache"`), plus a new `CacheEntryMeta` type pulled through `export type * from "./types/cache"`. Per `code.md` §`index.ts` Rules and §Package File Structure, extending a re-exported singleton's interface is a surface change.

### Package
resource

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`is<...>` / `get<...>` verb-first), §Types
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Template Selection

### Files
- `packages/resource/lib/cache.ts` — modify — add `isFetching` and `getEntryMeta` to the `resourceCache` object (after `onOnlineChange`, ~line 354)
- `packages/resource/lib/internal/dedupe.ts` — modify — add a `@internal` cross-scope lookup helper that walks the `ongoingRequestsMap` WeakMap (line 17) for a matching key
- `packages/resource/lib/types/cache.d.ts` — modify — extend the `ResourceCache` interface (line 55) with the two new methods; add a `CacheEntryMeta` interface and export it

### Public API delta
```ts
// packages/resource/lib/types/cache.d.ts
export interface CacheEntryMeta {
  readonly timestamp: number;
  readonly staleTime: number;
  readonly cacheTime: number;
  readonly lastAccess: number;
}

export interface ResourceCache {
  // ...existing members...
  /** Whether any fetcher scope currently has an in-flight request for `key`. */
  isFetching(key: unknown): boolean;
  /** Cache-entry metadata for the first non-expired match across scopes, or undefined. Excludes the cached `data` value. */
  getEntryMeta(key: unknown): CacheEntryMeta | undefined;
}
```

```ts
import { resourceCache } from "@hellajs/resource";

resourceCache.set("user:1", { id: 1 }, 60000);
resourceCache.getEntryMeta("user:1"); // { timestamp, staleTime, cacheTime, lastAccess } — no data
resourceCache.isFetching("user:1");   // false (no in-flight request); true while a fetcher is running
```

### Behavioral scenarios
- `isFetching(key)` returns `true` while a request for that key is in-flight in any fetcher scope, and `false` once it settles
- `getEntryMeta(key)` returns `{ timestamp, staleTime, cacheTime, lastAccess }` for a cached non-expired entry
- `getEntryMeta(key)` returns `undefined` for a missing or expired entry

### Doc placement
- `packages/resource/docs/api/resourcecache.mdx` — Function/Prefix Doc template — `## API` block: add the two signatures to the `ResourceCache` interface listing; `## Key Concepts`: add a `###` subsection on cache observability (isFetching for loading indicators across scopes; getEntryMeta for cache inspection without touching data) with the usage example above

### Tests view
New `tests/cache-observability.test.ts`, 3 scenarios per Behavioral scenarios above, per `tests.md` §Test Structure and §Scenario → test() derivation. Imports from `@hellajs/resource/bundle`; reactive primitives (`signal`/`effect`/`tick`/`delay`/`wait`) come from `globalThis` per `tests.md` §Shared State and Cleanup — never imported.

### Docs view
Modify `docs/api/resourcecache.mdx` per Doc placement above, per `docs.md` §Function & Prefix Docs and §Template Selection (the cache is an existing interface doc, so the trio owns it fully — no standalone page is created for an in-place interface extension).

---

## [ ] Implement cache observability (Code)
**Type:** Code
**Depends on:** None

### Strategy
Both methods reuse the existing cross-scope iteration pattern already used by `flatView.get`/`flatView.has` (cache.ts:181-206) and `resourceCache.get` (cache.ts:232). For `isFetching`, add a `@internal` helper in `dedupe.ts` that walks `ongoingRequestsMap` (WeakMap<object, Map<key, OngoingRequest>>, dedupe.ts:17) iterating each fetcher's inner map for a matching key — the dedup map is the single source of truth for in-flight requests, so searching it is the correct cross-scope query. For `getEntryMeta`, mirror `flatView.get`'s first-non-expired-match walk but return a projected `{ timestamp, staleTime, cacheTime, lastAccess }` (no `data`) — consistent with `getCacheData`'s expired-entry delete-and-return-undefined behavior (cache.ts:147). Trade-off considered and rejected: per-fetcher granularity on `isFetching` — rejected because every other `resourceCache` method (`get`, `invalidate`, etc.) is cross-scope; per-fetcher users reach the dedup map indirectly through their resource's `cacheKey`.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `resourceCache.isFetching` and `resourceCache.getEntryMeta` exist with the listed signatures; `CacheEntryMeta` is exported from `types/cache.d.ts`
- [ ] Every new exported symbol has JSDoc; `CacheEntryMeta` is re-exported via `index.ts` (no `@internal`); the dedupe cross-scope helper is `@internal` (not re-exported)
- [ ] No new runtime dependency
- [ ] Backward compatible — existing `resourceCache` API unchanged
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `cache.ts`, `internal/dedupe.ts`, `types/cache.d.ts` reports no deviations from `./guides/code.md`

## [ ] Test cache observability (Tests)
**Type:** Tests
**Depends on:** Implement cache observability

### Strategy
Three `test()`s map 1:1 to the Behavioral scenarios. `isFetching` true/false: drive a real resource with a delayed fetcher (use `delay` from `globalThis`), assert `isFetching(key)` true mid-flight and false after settle — cross-scope asserted by registering the key under one fetcher and querying `resourceCache.isFetching` (which is scope-agnostic). `getEntryMeta` hit: `resourceCache.set(key, data, cacheTime, staleTime)` then assert the four meta fields; `getEntryMeta` miss/expired: query a never-set key (undefined) and a key whose `cacheTime` has elapsed (mock `Date.now` per the cache/TTL testing convention in the resource AGENTS.md Testing section). Use `beforeEach` with `resourceCache.invalidateAll()` for isolation, not per-test inline resets (per `tests.md` §Shared State and Cleanup).

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`isFetching`, `getEntryMeta`, the dedupe cross-scope helper) named in Contract.Files
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (3 total)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source exposes — cross-checked against the implementation

## [ ] Document cache observability (Docs)
**Type:** Docs
**Depends on:** Implement cache observability

### Strategy
Per `docs.md` §Function & Prefix Docs, `resourcecache.mdx` is the existing interface doc for `resourceCache`; extend it in place (no new page — the standalone-page meta plan owns only NEW top-level exports). Add the two signatures to the `## API` interface listing and a `###` subsection under `## Key Concepts` covering cross-scope observability: `isFetching` for surfacing global loading indicators; `getEntryMeta` for cache inspection without materializing `data` (e.g., building devtools views). Seed the example from Contract.Public API delta verbatim.

### Definition of Done
- [ ] Every code example in the changed `resourcecache.mdx` compiles against the current source signatures
- [ ] The Function/Prefix Doc template from `./guides/docs.md` is preserved
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in the doc; usage example from Contract appears under `## Key Concepts`
- [ ] Package docs (`packages/resource/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
