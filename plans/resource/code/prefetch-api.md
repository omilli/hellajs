# [ ] prefetch-api

## Contract

### Surface change
yes — adds a `prefetch(options)` method to `resourceCache` (re-exported by `packages/resource/lib/index.ts`) plus a new `PrefetchOptions` type pulled through `export type * from "./types/cache"`. Per `code.md` §`index.ts` Rules and §Package File Structure, extending a re-exported singleton's interface is a surface change.

### Package
resource

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`prefetch` verb-first), §Types, §Functions & Modules, §Loops
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Mock Patterns, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Template Selection

### Files
- `packages/resource/lib/cache.ts` — modify — add `prefetch` to the `resourceCache` object (after `onOnlineChange`, ~line 354); may host the extracted shared fetch/dedupe/retry orchestration
- `packages/resource/lib/types/cache.d.ts` — modify — extend the `ResourceCache` interface (line 55) with `prefetch`; add and export the `PrefetchOptions<T, K>` interface
- `packages/resource/lib/resource.ts` — modify — extract the reusable fetch/cache/dedupe/retry orchestration from `run()` (resource.ts:161) into a shared helper that both `run()` and `resourceCache.prefetch` call (new `internal/fetch.ts` or a `cache.ts`-local helper)

### Public API delta
```ts
// packages/resource/lib/types/cache.d.ts
export interface PrefetchOptions<T, K> {
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

export interface ResourceCache {
  // ...existing members...
  /** Fetches via `fetcher(key)` and stores the result in the cache (fetcher scope) without creating a resource. Deduplicates, retries, and aborts like a resource fetch. Returns the fetched data. */
  prefetch<T, K>(options: PrefetchOptions<T, K>): Promise<T>;
}
```

```ts
import { resource, resourceCache } from "@hellajs/resource";

await resourceCache.prefetch({
  fetcher: (id: number) => fetch(`/api/users/${id}`).then(r => r.json()),
  key: 1,
  cacheTime: 60000,
});
// A later resource sharing the same fetcher reference + key hits the prefetched entry:
const r = resource(fetcher, { key: 1, cacheTime: 60000 });
```

### Behavioral scenarios
- `prefetch({ fetcher, key, cacheTime })` fetches data and stores it in the cache (fetcher scope)
- A subsequent `resource()` fetch with the same fetcher reference + key hits the prefetched cache entry (no network)
- Two concurrent `prefetch` calls with the same fetcher + key share one network request (dedup)
- `prefetch` respects `timeout`, `abortSignal`, and `retry` options

### Doc placement
- `packages/resource/docs/api/resourcecache.mdx` — Function/Prefix Doc template — `## API` block: add the `prefetch` signature + `PrefetchOptions` interface to the listing; `## Key Concepts`: add a `### Prefetching` subsection covering the fire-and-forget utility, dedup/retry/abort parity with `resource`, same-fetcher-reference requirement for cache hits, and the example above

### Tests view
New `tests/prefetch-api.test.ts`, 4 scenarios per Behavioral scenarios above, per `tests.md` §Test Structure and §Scenario → test() derivation. Uses `mock()` from `bun:test` to count fetcher invocations (dedup assertion) and `delay`/`Date.now` mocks for timeout/retry timing.

### Docs view
Modify `docs/api/resourcecache.mdx` per Doc placement above, per `docs.md` §Function & Prefix Docs (existing interface doc, owned fully by this trio — no standalone page).

---

## [ ] Implement prefetch API (Code)
**Type:** Code
**Depends on:** None

### Strategy
`prefetch` resolves the key, consults the dedup map (unless `deduplicate: false`) and joins any in-flight same-fetcher+key request; otherwise creates an `AbortController`, registers via `setOngoing`, runs the fetcher with the same abort/timeout/retry pipeline as `run()` (resource.ts:161), stores the result via `setCacheData(fetcher, key, data, cacheTime, staleTime)`, resolves the dedup promise, and returns the data. **The primary work is extraction, not duplication**: the fetch/cache/retry/dedup orchestration already lives in `resource.ts:run()` — pull it into a shared helper (new `lib/internal/fetch.ts` or a `cache.ts`-local function) that both `run()` and `prefetch` call. URL-string overload is deferred (users pass an explicit fetcher). No resource object is created — `prefetch` returns `Promise<T>`; cache + dedup are keyed by fetcher reference identity (same as resources), so a resource sharing the same fetcher function reference + key hits the prefetched entry. Trade-off considered and rejected: duplicating the pipeline inline in `cache.ts` — rejected because it would diverge from `run()`'s abort/retry semantics under maintenance.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `resourceCache.prefetch` exists with the listed signature; `PrefetchOptions` is exported from `types/cache.d.ts`
- [ ] Every new exported symbol has JSDoc; `PrefetchOptions` is re-exported via `index.ts` (no `@internal`); any extracted `@internal` helper is not re-exported
- [ ] No new runtime dependency
- [ ] Backward compatible — `resourceCache` API extension; `run()` behavior in `resource.ts` unchanged after the extraction
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `cache.ts`, `types/cache.d.ts`, `resource.ts` (and any new `internal/fetch.ts`) reports no deviations from `./guides/code.md`

## [ ] Test prefetch API (Tests)
**Type:** Tests
**Depends on:** Implement prefetch API

### Strategy
Four `test()`s map 1:1 to the Behavioral scenarios. Store+hit: `prefetch` with a `mock()`-wrapped fetcher + `cacheTime > 0`, then construct a `resource` with the **same fetcher reference** and assert its cache lookup hits (fetcher not called again — assert call count). Dedup: two concurrent `prefetch` calls with the same fetcher + key, assert the fetcher runs exactly once. Timeout/abort/retry: use `delay` (from `globalThis`) and a `timeout` to drive the abort path; a rejecting fetcher with `retry: 2` to exercise the retry loop. `beforeEach` resets the cache and dedup via `resourceCache.invalidateAll()`.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`prefetch` + the extracted shared helper) named in Contract.Files
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (4 total)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source exposes — cross-checked against the implementation

## [ ] Document prefetch API (Docs)
**Type:** Docs
**Depends on:** Implement prefetch API

### Strategy
Per `docs.md` §Function & Prefix Docs, extend `resourcecache.mdx` in place. Add the `prefetch` signature + the `PrefetchOptions` interface to the `## API` listing, then a `### Prefetching` subsection under `## Key Concepts` covering: fire-and-forget utility (no resource object created); dedup/retry/abort parity with `resource()`; the same-fetcher-reference requirement for a later resource to hit the prefetched entry (call out the cache+dedup-are-keyed-by-reference rule); and the deferred URL overload. Seed the example from Contract.Public API delta verbatim.

### Definition of Done
- [ ] Every code example in the changed `resourcecache.mdx` compiles against the current source signatures
- [ ] The Function/Prefix Doc template from `./guides/docs.md` is preserved
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in the doc; usage example from Contract appears under `## Key Concepts`
- [ ] Package docs (`packages/resource/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
