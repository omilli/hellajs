# [ ] ssr-serialize-hydrate

> **Cross-plan dependency:** this plan depends on the **prefetch-api** plan landing first — the SSR integration pattern is `prefetch` on the server → `toJSON()` → inject → `hydrate()` on the client, and `toJSON`'s scope-handling decision (Approach C) leans on prefetch as the recommended fetcher-scoped server mechanism.

## Contract

### Surface change
yes — adds two methods (`toJSON`, `hydrate`) to `resourceCache` (re-exported by `packages/resource/lib/index.ts`) plus new `SerializedCacheEntry` and `SerializedCache` types pulled through `export type * from "./types/cache"`. Per `code.md` §`index.ts` Rules and §Package File Structure, extending a re-exported singleton's interface is a surface change.

### Package
resource

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`toJSON`/`hydrate`), §Types, §Loops
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Template Selection, §Pattern Docs

### Files
- `packages/resource/lib/cache.ts` — modify — add `toJSON` and `hydrate` to the `resourceCache` object (after `onOnlineChange`, ~line 354)
- `packages/resource/lib/types/cache.d.ts` — modify — extend the `ResourceCache` interface (line 55) with `toJSON`/`hydrate`; add and export `SerializedCacheEntry` and `SerializedCache`

### Public API delta
```ts
// packages/resource/lib/types/cache.d.ts
export interface SerializedCacheEntry {
  scope: "__public__";          // v1: only public-scope entries are serialized (Approach C)
  key: unknown;
  data: unknown;
  timestamp: number;
  cacheTime: number;
  staleTime: number;
  lastAccess: number;
}

export interface SerializedCache {
  entries: SerializedCacheEntry[];
}

export interface ResourceCache {
  // ...existing members...
  /** Serializes all non-expired public-scope entries (fetcher-scoped entries are NOT serialized in v1). */
  toJSON(): SerializedCache;
  /** Bulk-populates the cache from a serialized payload. Skips entries whose cacheTime has elapsed. Returns the count restored. */
  hydrate(payload: SerializedCache): number;
}
```

```ts
import { resourceCache } from "@hellajs/resource";

// Server: prefetch public entries, render, inject JSON
resourceCache.set("user:1", { id: 1 }, 60000);
const json = resourceCache.toJSON();            // { entries: [{ scope: "__public__", key: "user:1", ... }] }

// Client: hydrate before creating resources
const restored = resourceCache.hydrate(JSON.parse(el.textContent)); // → 1
resourceCache.get("user:1");                    // → { id: 1 }
```

### Behavioral scenarios
- `toJSON()` returns only non-expired public-scope entries in `{ entries: [...] }`
- Expired entries are excluded from `toJSON()` (and deleted in passing, consistent with `getCacheData`)
- `hydrate(payload)` populates the public scope and returns the count of entries restored
- Hydrated entries are returned by `resourceCache.get(key)` and `resourceCache.map.get(key)`

### Doc placement
- `packages/resource/docs/api/resourcecache.mdx` — Function/Prefix Doc template — `## API` block: add `toJSON`/`hydrate` signatures + the `SerializedCacheEntry`/`SerializedCache` types; `## Key Concepts`: add a `### SSR serialization` subsection stating Approach C (fetcher-scoped entries not serialized in v1; prefetch is the recommended server mechanism), explicit-hydrate (no auto-magic), and the example above
- `packages/resource/docs/patterns/resource.mdx` — Pattern Doc template — add a `### SSR data hydration` pattern showing the server prefetch → `toJSON` → inject → client `hydrate` flow

### Tests view
New `tests/ssr-serialize-hydrate.test.ts`, 4 scenarios per Behavioral scenarios above, per `tests.md` §Test Structure and §Scenario → test() derivation. Mock `Date.now` to assert expired-entry exclusion and skip-on-hydrate.

### Docs view
Modify `docs/api/resourcecache.mdx` (API + Key Concepts) and `docs/patterns/resource.mdx` (SSR pattern) per Doc placement above, per `docs.md` §Function & Prefix Docs and §Pattern Docs (existing interface + existing pattern docs, owned fully by this trio — no standalone page).

---

## [ ] Implement SSR serialize/hydrate (Code)
**Type:** Code
**Depends on:** None

### Strategy
`toJSON` walks the public scope (`PUBLIC_SCOPE`, cache.ts:10) and emits a `SerializedCacheEntry` per non-expired entry (expired entries are excluded and deleted, mirroring `getCacheData` at cache.ts:147). **Approach C is the chosen scope decision: fetcher-scoped entries are NOT serialized in v1** — there is no stable string key for a fetcher function reference, and the prefetch API is the recommended server-side mechanism for fetcher-scoped data. `hydrate(payload)` iterates `payload.entries`, skips any whose `cacheTime` window has elapsed, and calls `setCacheData(PUBLIC_SCOPE, key, data, cacheTime, staleTime)` for the rest, returning the restored count. `hydrate` is explicit (user calls it) — no auto-magic. `toJSON` includes all non-expired entries regardless of staleness (stale entries are still valid cache; staleness only triggers SWR). Trade-offs considered and rejected: Approach A (serialize only public scope with no path forward — Approach C is A plus the prefetch recommendation) and Approach B (require a `serializeScope` string option on `resource()` — adds API surface for a v1 edge case; deferred).

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `resourceCache.toJSON`/`hydrate` exist with the listed signatures; `SerializedCacheEntry`/`SerializedCache` are exported from `types/cache.d.ts`
- [ ] Every new exported symbol has JSDoc; both types are re-exported via `index.ts` (no `@internal`)
- [ ] No new runtime dependency
- [ ] Backward compatible — `resourceCache` API extension; no change to existing `resource()` behavior
- [ ] Fetcher-scoped entries are not serialized by default (Approach C — documented limitation)
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `cache.ts`, `types/cache.d.ts` reports no deviations from `./guides/code.md`

## [ ] Test SSR serialize/hydrate (Tests)
**Type:** Tests
**Depends on:** Implement SSR serialize/hydrate

### Strategy
Four `test()`s map 1:1 to the Behavioral scenarios. Non-expired emission: `set` two public entries with `cacheTime > 0`, `toJSON()`, assert both appear with correct meta and `scope: "__public__"`. Expired exclusion: mock `Date.now` forward past one entry's `cacheTime`, `toJSON()`, assert that entry is absent (and deleted in passing). Hydrate populate: `toJSON()` → `invalidateAll()` → `hydrate(payload)` → assert return count and that `resourceCache.get(key)` and `resourceCache.map.get(key)` return the data. `beforeEach` resets the cache. Use plain object payloads (no `JSON.parse` needed in-test unless verifying the round-trip through a string).

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`toJSON`, `hydrate`) named in Contract.Files
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (4 total)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source exposes — cross-checked against the implementation

## [ ] Document SSR serialize/hydrate (Docs)
**Type:** Docs
**Depends on:** Implement SSR serialize/hydrate

### Strategy
Per `docs.md` §Function & Prefix Docs and §Pattern Docs. Extend `resourcecache.mdx` in place: add `toJSON`/`hydrate` + the two serialized types to `## API`, and a `### SSR serialization` subsection under `## Key Concepts` that explicitly states Approach C (fetcher-scoped entries not serialized in v1; prefetch is the recommended server mechanism), explicit-hydrate, and the non-expired-only rule. Then add a `### SSR data hydration` pattern to `docs/patterns/resource.mdx` showing the full server prefetch → `toJSON` → inject into HTML → client `hydrate` flow. Seed the example from Contract.Public API delta verbatim.

### Definition of Done
- [ ] Every code example in the changed `resourcecache.mdx` and `patterns/resource.mdx` compiles against the current source signatures
- [ ] The Function/Prefix Doc and Pattern Doc templates from `./guides/docs.md` are preserved on the respective files
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in `resourcecache.mdx`; usage example from Contract appears under `## Key Concepts`
- [ ] Package docs (`packages/resource/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
