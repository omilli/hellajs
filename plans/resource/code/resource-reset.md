# [ ] resource-reset

## Contract

### Surface change
yes — adds a new top-level export `resetResource` to `packages/resource/lib/index.ts` (alongside `resource` and `resourceCache`). Per `code.md` §`index.ts` Rules and §Package File Structure, a new re-exported symbol is a surface change.

### Package
resource

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`reset<Package>` verb-first, matching `resetDom`/`resetRouter`/`resetCss`)
- Public API delta ← `code.md` §`index.ts` Rules, §JSDoc, §Memory (WeakMap has no `.clear()` → reassign)
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Template Selection

### Files
- `packages/resource/lib/resetResource.ts` — create — exports `resetResource(): void` (calls `resetCacheState()` then `resetDedupe()`)
- `packages/resource/lib/cache.ts` — modify — add an `@internal resetCacheState()` that calls `cacheMap.clear()` (cache.ts:12), `onlineCallbacks.clear()` (cache.ts:17), and resets `lastCleanupTime = 0` (cache.ts:14)
- `packages/resource/lib/internal/dedupe.ts` — modify — change `ongoingRequestsMap` (line 17) from `const` to `let`, add an `@internal resetDedupe()` that reassigns `ongoingRequestsMap = new WeakMap()` (WeakMap has no `.clear()` — reassign per `code.md` §Memory; already noted in dedupe.ts:6-7 module comment)
- `packages/resource/lib/index.ts` — modify — add `export { resetResource } from "./resetResource";`
- `packages/resource/AGENTS.md` — modify — exports table: add `resetResource`; note `invalidateAll` is NOT a full reset (misses the dedup map + `onlineCallbacks` + `lastCleanupTime`); regenerated `CLAUDE.md` + `.github/instructions/*` via `bun sync`
- `packages/resource/docs/api/resetresource.mdx` — create — Function template; `# resetResource`; `## API` signature; self-contained `## Basic Usage`; `## Key Concepts` covering the real-world nuke use cases (HMR, session reset, logout, error recovery, testing) + explicit note on which state it clears (vs `resourceCache.invalidateAll`)
- `docs/src/pages/reference/resource/resetresource.mdx` — create — website wrapper with `title`/`description`/`layout`

### Public API delta
```ts
// packages/resource/lib/index.ts — added
export { resetResource } from "./resetResource";
```

```ts
import { resetResource } from "@hellajs/resource";

// On logout, HMR, or catastrophic recovery — a real-world nuke, not a test hook:
resetResource(); // clears cacheMap + ongoingRequestsMap + onlineCallbacks + lastCleanupTime
```

### Behavioral scenarios
- `resetResource()` clears `cacheMap` (the cache) — `resourceCache.map.size === 0` after
- `resetResource()` clears `ongoingRequestsMap` (the dedup map) — in-flight dedup lookups miss after reset
- `resetResource()` clears `onlineCallbacks` (the online/offline subscriber set) — `onOnlineChange` subscribers no longer fire
- `resetResource()` resets `lastCleanupTime` to `0` (the cleanup throttle) — next `setCacheData` runs `cleanupExpiredCache` unconditionally
- Contrast: `resourceCache.invalidateAll()` (cache.ts:339-343) is insufficient — it only does `cacheMap.clear()`, leaking `onlineCallbacks`, `lastCleanupTime`, and `ongoingRequestsMap`

### Doc placement
- `packages/resource/docs/index.mdx` — Index template — `### API` bullet list — add a `resetResource` entry linking to `/reference/resource/resetresource`
- `packages/resource/docs/api/resetresource.mdx` — Function template — `# resetResource`; `## API` signature; self-contained `## Basic Usage`; `## Key Concepts` covering the real-world nuke use cases (HMR, session reset, logout, error recovery, testing) + explicit note on which state it clears (vs `resourceCache.invalidateAll`)
- `docs/src/pages/reference/resource/resetresource.mdx` — website wrapper with `title`/`description`/`layout`
- `packages/resource/AGENTS.md` — exports table: add `resetResource`; note `invalidateAll` is NOT a full reset (misses dedup map + `onlineCallbacks` + `lastCleanupTime`); regenerated mirrors via `bun sync`

### Tests view
New `tests/reset-resource.test.ts`, 5 scenarios per Behavioral scenarios above, per `tests.md` §Test Structure and §Scenario → test() derivation. Contrasts `resetResource()` against `invalidateAll()` insufficiency.

### Docs view
This trio owns the full blast radius: modify `packages/resource/docs/index.mdx` API list, create the standalone `packages/resource/docs/api/resetresource.mdx` Function-template page + its website wrapper, and add `resetResource` to `packages/resource/AGENTS.md` exports table (with the `invalidateAll`-is-not-a-full-reset note), then run `bun sync` to regenerate mirrors — all per `docs.md` §File Locations & Naming and §Function & Prefix Docs. No meta coordination plan is cited.

---

## [ ] Implement resetResource (Code)
**Type:** Code
**Depends on:** None

### Strategy
`resourceCache.invalidateAll()` only does `cacheMap.clear()` (cache.ts:341) — proven insufficient: it leaves `onlineCallbacks` (cache.ts:17, a subscriber leak across sessions), `lastCleanupTime` (cache.ts:14, stale throttle), and `ongoingRequestsMap` (dedupe.ts:17, stale in-flight registrations). `resetResource()` is a real-world nuke (logout, HMR, error recovery), not a test hook. Split the reset into two `@internal` helpers so each module owns its own state: `resetCacheState()` in `cache.ts` (clears `cacheMap` + `onlineCallbacks`, resets `lastCleanupTime = 0`) and `resetDedupe()` in `dedupe.ts` (reassigns `ongoingRequestsMap = new WeakMap()` — WeakMap has no `.clear()`, so reassignment is the only correct path, as the dedupe.ts:6-7 module comment already anticipates). `ongoingRequestsMap` must change from `const` to `let` to allow reassignment. `resetResource()` in the new `resetResource.ts` calls both. Verb-first `reset<Package>` matches the cross-package convention (`resetDom`, `resetRouter`, `resetCss`). Trade-off considered and rejected: adding a single `resetResource` that reaches across modules — rejected because it would break module encapsulation; the two-helper split keeps each module's reset logic co-located with its state.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched/created as specified — `resetResource.ts` exists; `ongoingRequestsMap` is `let`
- [ ] Public API delta in Contract implemented verbatim — `lib/index.ts` re-exports `resetResource` from `./resetResource`
- [ ] Every new exported symbol has JSDoc; `resetResource` is re-exported by `index.ts` (no `@internal`); `resetCacheState` and `resetDedupe` are `@internal` (not re-exported)
- [ ] No new runtime dependency
- [ ] Backward compatible — new public symbol, no existing signature changed → minor changeset
- [ ] A changeset exists at `.changeset/*.md` declaring `minor` for `@hellajs/resource`
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below) and own the standalone page + AGENTS.md sync directly
- [ ] Audit skill run on `resetResource.ts`, `cache.ts`, `internal/dedupe.ts`, `index.ts` reports no deviations from `./guides/code.md`

## [ ] Test resetResource (Tests)
**Type:** Tests
**Depends on:** Implement resetResource

### Strategy
Five `test()`s map 1:1 to the Behavioral scenarios. Set up dirty state, call `resetResource()`, assert each piece is cleared: cache (`resourceCache.map.size === 0`), dedup (a prior `setOngoing` entry no longer resolves via `getOngoing` — note `getOngoing` is `@internal`, so assert indirectly by observing dedup miss behavior on a fresh fetch), `onlineCallbacks` (register an `onOnlineChange` cb, reset, fire a synthetic online event and assert the cb does not fire), `lastCleanupTime` (reset, then trigger `cleanupExpiredCache` and assert it ran — i.e., the throttle did not skip). Final test asserts the contrast: `invalidateAll()` clears the cache but leaves the other three dirty (the inverse assertions). `beforeEach` runs `resetResource()` for isolation.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`resetResource`, `resetCacheState`, `resetDedupe`) named in Contract.Files
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (5 total, including the `invalidateAll` contrast)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source exposes — cross-checked against the implementation

## [ ] Document resetResource in the index API list (Docs)
**Type:** Docs
**Depends on:** Implement resetResource

### Strategy
Per `docs.md` §File Locations & Naming and the Function template (§Function & Prefix Docs), this task owns the full doc surface: (1) add a `resetResource` bullet to `packages/resource/docs/index.mdx`'s `### API` list linking to `/reference/resource/resetresource` with a one-line description (real-world nuke: logout, HMR, error recovery — clears cache + dedup + online subscribers + cleanup throttle); (2) create the standalone `packages/resource/docs/api/resetresource.mdx` page — `# resetResource`, `## API` (`resetResource(): void` verbatim from Contract.Public API delta), self-contained `## Basic Usage` with imports, `## Key Concepts` covering the nuke use cases (HMR, session reset, logout, error recovery, testing) + an explicit note on which state it clears vs `resourceCache.invalidateAll` (which only clears the cache, leaking dedup + `onlineCallbacks` + `lastCleanupTime`); (3) create the website wrapper `docs/src/pages/reference/resource/resetresource.mdx` with `title`/`description`/`layout`; (4) add `resetResource` to `packages/resource/AGENTS.md` exports table with the `invalidateAll`-is-not-a-full-reset note, then run `bun sync` to regenerate mirrors.

### Definition of Done
- [ ] Every code example in the changed `index.mdx` compiles against the current source signatures
- [ ] The Index template from `./guides/docs.md` is preserved
- [ ] The `resetResource` entry exists in `packages/resource/docs/index.mdx`'s API list with the specified content and link target
- [ ] Public API delta signature (`export { resetResource } from "./resetResource"`) is reflected by the new API list entry
- [ ] Package docs (`packages/resource/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] The standalone `packages/resource/docs/api/resetresource.mdx` page exists (Function template) and the website wrapper `docs/src/pages/reference/resource/resetresource.mdx` exists with `title`/`description`/`layout`
- [ ] `packages/resource/AGENTS.md` exports table includes `resetResource` with the `invalidateAll`-is-not-a-full-reset note; `bun sync` regenerates `CLAUDE.md` + `.github/instructions/*`
