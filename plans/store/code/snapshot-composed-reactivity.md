# [ ] snapshot-composed-reactivity

## Contract

### Surface change
no — no new, changed, or removed symbol re-exported by `packages/store/lib/index.ts`; the `snapshot()` signature is unchanged. This is a behavior change to the existing snapshot computed that spans Code + Tests + Docs, so it carries one task per type despite Surface: no (TEMPLATE allows multiple tasks for Surface: no when work spans distinct concerns). The Tests and Docs views below point at the Tests/Docs tasks — they DO exist, justified by the behavior flip (not "no impact").

### Package
store

### Guide governance
- Files ← `code.md` §Package File Structure, §Files, §Functions & Modules, §Loops, §Memory, §Decision Precedence
- Behavioral scenarios ← `tests.md` §Files, §File-naming for tests, §Test Structure, §Scenario → test() derivation, §Anti-Patterns
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Concept Docs

### Files
- `packages/store/lib/create.ts` — modify — snapshot computed (lines 38-59); replace the nested-store branch at lines 51-52 (`value.snapshot()`, which captures the value but not the dependency) with a recursive `readDeep` walk that reads every leaf signal inline so the parent computed subscribes to the whole composed tree
- `packages/store/lib/utils.ts` — modify (if `readDeep` stays shared/pure) — new `readDeep` helper, co-located with the existing `isStore` shape check (lines 26-33); otherwise defined inside the `createStore` closure
- `packages/store/tests/nested.test.ts` — modify — flip the test at lines 140-155 ("snapshot is not deeply reactive across composed stores") to assert reactivity
- `packages/store/tests/snapshot.test.ts` — modify — add composed-reactivity coverage per Behavioral scenarios
- `packages/store/docs/api/store.mdx` — modify — snapshot section: add positive cross-store example + expand the Performance warning for the wider dependency footprint
- `packages/store/AGENTS.md` — modify — remove the old non-reactive-behavior claim (scoped to this behavior flip; broader AGENTS.md regeneration owned by `meta/docs/agents-md-sync.md` — cross-reference noted, not duplicated)
- `packages/store/store-comparison.md` — modify — §5 Snapshot & Derivation (HellaJS Reactivity cell + prose) and §10 Bottom Line (remove the gap)

### Behavioral scenarios
- `snapshot()` of a store composing another store re-runs an effect that read it when an inner leaf signal changes (the flip from `tests/nested.test.ts:140-155`)
- deeply nested composed stores (three levels): innermost leaf mutation fires the outermost snapshot effect
- composed store with array leaves: pushing via `update(draft => draft.items.push(x))` reads the inner array signal inline and fires the outer snapshot effect
- composed readonly store: the readonly computed wrap is still a function called inline, so reactivity is preserved

### Doc placement
- `packages/store/docs/api/store.mdx` — Function template (existing) — snapshot section — add positive cross-store example + expand the Performance/escape-hatch warning (read individual signals in effects for wide stores)
- `packages/store/AGENTS.md` — instructions — remove the old non-reactive-behavior claim (scoped edit; broader sync owned by `meta/docs/agents-md-sync.md`)
- `packages/store/store-comparison.md` — comparison — §5 (HellaJS Reactivity cell → "Reactive across the full composed tree" + drop the limitation prose) and §10 Bottom Line (drop the gap bullet)

### Tests view
Flip `tests/nested.test.ts:140-155` to assert the new reactive behavior; add positive coverage in `tests/snapshot.test.ts` per Behavioral scenarios (three new). These exist because the behavior flips — the "no impact" absence does not apply. Per tests.md §Test Structure and §Scenario → test() derivation.

### Docs view
Update the snapshot section in `docs/api/store.mdx`, the scoped non-reactive claim in `packages/store/AGENTS.md`, and `store-comparison.md` §5 + §10. These exist because the behavior flips — the "no impact" absence does not apply. Per docs.md §Function & Prefix Docs (api page) and §Concept Docs.

---

## [ ] Implement readDeep snapshot algorithm (Code)
**Type:** Code
**Depends on:** None

### Strategy
The snapshot computed at `lib/create.ts:38-59` currently calls `value.snapshot()` on a nested store (lines 51-52), which captures the inner computed's return value but does not register the parent computed as a subscriber to the inner leaf signals — the inner `snapshot` is a separate node in the core dependency graph, so inner writes never dirty the parent. Replace that branch with a recursive `readDeep(node, initialNode, out)` walk: for each non-reserved key, if the original value was a function copy the original reference; if the value is a store (the `isStore` shape check at `lib/utils.ts:26-33`) recurse via `readDeep(value, initialValue, out[key] = {})`; if the value is any other function (leaf signal) call it inline (`value()`) to register the dependency and assign the result; else assign as-is. Hot-path optimizations (user-requested): cache `Object.keys(result)` once per `createStore` invocation (the key set is stable — `update()` cannot introduce new keys per the `applyUpdate` early-return), and reuse a cached-`len` `while` loop (code.md §Loops) materialized at store construction. Building the snapshot object in place avoids intermediate allocations per recursion. The recursion adds work proportional to total leaf count — document the escape hatch (read individual signals in effects for wide stores). Breaking change → the existing `tests/nested.test.ts:140-155` flips. Trade-off considered and rejected: leaving the limitation and documenting it — it is the comparison-doc §5/§10 gap and breaks the reactive-chain expectation. `readDeep` goes in `lib/utils.ts` if it stays shared/pure, else inside the `createStore` closure.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified — the nested-store branch at `lib/create.ts:51-52` no longer captures value-without-dependency
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`) — `readDeep` is `@internal`
- [ ] No new runtime dependency
- [ ] A changeset exists at `.changeset/*.md` declaring `major` for `@hellajs/store` (breaking behavior change — `snapshot()` now propagates across composed stores)
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `lib/create.ts` (+ `lib/utils.ts` if `readDeep` lands there) reports no deviations from `./guides/code.md`

## [ ] Flip nested snapshot test and add composed-reactivity coverage (Tests)
**Type:** Tests
**Depends on:** Implement readDeep snapshot algorithm

### Strategy
Edit `tests/nested.test.ts:140-155`: rename "snapshot is not deeply reactive across composed stores" to "snapshot is reactive across composed stores" and flip the assertion — after `userStore.name("Bob")`, the effect that read `appStore.snapshot()` runs twice (initial + mutation), tracked by `mock()` asserting `toHaveBeenCalledTimes(2)`. Add coverage in `tests/snapshot.test.ts` for the remaining Behavioral scenarios (three-level nesting, array leaves via `update(draft => ...)`, composed readonly store). No anti-patterns: `mock()` from `bun:test`, no `any`, no boolean-flag counters. Cross-check each assertion against the new `readDeep` implementation.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on the `readDeep` algorithm (in `lib/create.ts` or `lib/utils.ts` — name the file + line range in the commit message)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (one flipped + three new)
- [ ] Overall coverage is not lower than before this task
- [ ] The `tests/nested.test.ts:140-155` assertion is flipped to `toHaveBeenCalledTimes(2)` after the inner mutation
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against the `readDeep` implementation

## [ ] Update snapshot docs, AGENTS.md, and comparison (Docs)
**Type:** Docs
**Depends on:** Implement readDeep snapshot algorithm

### Strategy
Update the `docs/api/store.mdx` snapshot section — remove any composed-store limitation callout, add a positive cross-store reactivity example, and expand the Performance warning to cover the wider dependency footprint of composed snapshots (escape hatch: read individual signals in effects for wide stores). Edit `packages/store/AGENTS.md` to remove the old non-reactive-behavior claim — this is a scoped edit specific to the behavior flip (the broader AGENTS.md / `CLAUDE.md` regeneration is owned by `meta/docs/agents-md-sync.md`; cross-reference noted, not duplicated). Update `store-comparison.md`: §5 HellaJS Reactivity cell → "Reactive across the full composed tree" and drop the limitation prose; §10 Bottom Line → drop "a snapshot that does not stay reactive across composed-store boundaries" from the gaps list (cited at `store-comparison.md:108-121` and `:262-274`).

### Definition of Done
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The Function template from `./guides/docs.md` is preserved on `docs/api/store.mdx`
- [ ] Package docs (`packages/store/docs/**/*.mdx`) have no frontmatter
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against `lib/create.ts` and the flipped tests
- [ ] `store-comparison.md` §5 and §10 reflect cross-store reactivity; no stale "not reactive across composed stores" text remains
- [ ] `packages/store/AGENTS.md` no longer claims snapshot is non-reactive across composed stores
