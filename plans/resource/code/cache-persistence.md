# [ ] cache-persistence

> **Cross-plan dependency:** this plan depends on the **ssr-serialize-hydrate** plan landing first — `save`/`load` are thin wrappers over `resourceCache.toJSON()` and `resourceCache.hydrate()`. If those are not yet implemented, `save`/`load` would have to inline their own serialization, which would duplicate the SSR pipeline; the design assumes they exist.

## Contract

### Surface change
yes — adds two methods (`save`, `load`) to `resourceCache` (re-exported by `packages/resource/lib/index.ts`) plus a new `StorageAdapter` type pulled through `export type * from "./types/cache"`. Per `code.md` §`index.ts` Rules and §Package File Structure, extending a re-exported singleton's interface is a surface change.

### Package
resource

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`save`/`load` verb-first), §Types
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc, §Error Handling
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Mock Patterns, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Template Selection

### Files
- `packages/resource/lib/cache.ts` — modify — add `save` and `load` to the `resourceCache` object (after `onOnlineChange`, ~line 354); they delegate to `toJSON()`/`hydrate()` (added by ssr-serialize-hydrate)
- `packages/resource/lib/types/cache.d.ts` — modify — extend the `ResourceCache` interface (line 55) with `save`/`load`; add and export a `StorageAdapter` interface

### Public API delta
```ts
// packages/resource/lib/types/cache.d.ts
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ResourceCache {
  // ...existing members...
  /** Serializes non-expired entries via toJSON() and writes them to the adapter under `key` (default "@hellajs/resource"). */
  save(adapter: StorageAdapter, key?: string): void;
  /** Reads `key` from the adapter, hydrates the cache, and returns the number of entries restored (0 if none stored). */
  load(adapter: StorageAdapter, key?: string): number;
}
```

```ts
import { resourceCache } from "@hellajs/resource";

resourceCache.set("user:1", { id: 1 }, 60000);
resourceCache.save(localStorage);                          // default key "@hellajs/resource"
const restored = resourceCache.load(localStorage, "user:1"); // partitioned under a custom key
```

### Behavioral scenarios
- `save(adapter)` then `load(adapter)` round-trip: a fresh cache's `resourceCache.get(key)` returns the same values that were saved
- `load(adapter)` with no stored data returns `0` without throwing

### Doc placement
- `packages/resource/docs/api/resourcecache.mdx` — Function/Prefix Doc template — `## API` block: add `save`/`load` signatures + the `StorageAdapter` interface to the listing; `## Key Concepts`: add a `### Persistence` subsection stating manual save/restore only (no auto-persist), the default key, partitioning via the `key` argument, and the example above

### Tests view
New `tests/cache-persistence.test.ts`, 2 scenarios per Behavioral scenarios above, per `tests.md` §Test Structure and §Scenario → test() derivation. A mock `StorageAdapter` (in-memory `Map`) avoids any DOM/Web Storage dependency — per `tests.md` §Mock Patterns, hand-rolled fakes over `vi.fn`.

### Docs view
Modify `docs/api/resourcecache.mdx` per Doc placement above, per `docs.md` §Function & Prefix Docs (existing interface doc, owned fully by this trio — no standalone page).

---

## [ ] Implement cache persistence (Code)
**Type:** Code
**Depends on:** None

### Strategy
`save` = `adapter.setItem(key ?? "@hellajs/resource", JSON.stringify(resourceCache.toJSON()))`; `load` reads, returns `0` on `null`, else `resourceCache.hydrate(JSON.parse(raw))` and returns the restored count (`hydrate`'s return). Default key `"@hellajs/resource"`; partitioning via the `key` argument. **Manual save/restore only — no auto-persist with debounce** (preserved decision from source): keeps the API simple, avoids write amplification, gives users full control over when persistence happens. **No adapter implementations shipped** — users supply `localStorage`/`sessionStorage` (which match the interface directly) or a wrapper; this preserves the zero-dependency promise and avoids Web Storage APIs that may not exist in all environments. Error handling: `load` with a stored value that fails `JSON.parse` should not silently corrupt — surface the parse error (per `code.md` §Error Handling); the "no stored data" path (null) returns `0` cleanly.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `resourceCache.save`/`load` exist with the listed signatures; `StorageAdapter` is exported from `types/cache.d.ts`
- [ ] Every new exported symbol has JSDoc; `StorageAdapter` is re-exported via `index.ts` (no `@internal`)
- [ ] No new runtime dependency
- [ ] Backward compatible — `resourceCache` API extension
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `cache.ts`, `types/cache.d.ts` reports no deviations from `./guides/code.md`

## [ ] Test cache persistence (Tests)
**Type:** Tests
**Depends on:** Implement cache persistence

### Strategy
Two `test()`s map 1:1 to the Behavioral scenarios. Round-trip: `resourceCache.set` a few entries with `cacheTime > 0`, `save(adapter)`, call `resourceCache.invalidateAll()` to emulate a fresh cache, `load(adapter)`, assert `resourceCache.get(key)` returns the original values and the return count matches. Use a hand-rolled `Map`-backed `StorageAdapter` fake (no `vi.fn`); `beforeEach` resets the cache via `resourceCache.invalidateAll()`. Empty-load: call `load` on an empty adapter and assert `0` with no throw. Mock `Date.now` if any entry needs to survive a TTL window across the round-trip (per the resource AGENTS.md Testing convention).

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`save`, `load`) named in Contract.Files
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (2 total)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source exposes — cross-checked against the implementation

## [ ] Document cache persistence (Docs)
**Type:** Docs
**Depends on:** Implement cache persistence

### Strategy
Per `docs.md` §Function & Prefix Docs, extend `resourcecache.mdx` in place. Add `save`/`load` + the `StorageAdapter` interface to the `## API` listing, then a `### Persistence` subsection under `## Key Concepts` that explicitly states the manual-only design decision (no auto-persist), the default key, partitioning, and that no adapter implementations ship (users pass `localStorage`/`sessionStorage` or a wrapper). Seed the example from Contract.Public API delta verbatim.

### Definition of Done
- [ ] Every code example in the changed `resourcecache.mdx` compiles against the current source signatures
- [ ] The Function/Prefix Doc template from `./guides/docs.md` is preserved
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in the doc; usage example from Contract appears under `## Key Concepts`
- [ ] Package docs (`packages/resource/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
