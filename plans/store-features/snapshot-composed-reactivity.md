## [ ] Make snapshot reactive across composed-store boundaries (breaking)

### Depends On
None

### Objective
Calling `outerStore.snapshot()` and reading its result inside an `effect()` re-runs the effect when any leaf signal of a composed inner store changes — closing the reactive-chain break currently asserted by `tests/nested.test.ts:140`.

### Sub-tasks

#### [ ] Snapshot deep-read algorithm (Code)
**Solution:**
Modify the snapshot computed in `packages/store/lib/create.ts:38-59`. Today the snapshot calls `value.snapshot()` on a nested store (`lib/create.ts:51-52`), which captures the inner computed's return value but does not register the parent computed as a subscriber to the inner leaf signals — because the inner `snapshot` is a separate node in `@hellajs/core`'s dependency graph. Inner-store writes therefore do not dirty the parent snapshot computed. Verified by `tests/nested.test.ts:140-155`.

New algorithm: replace the `value.snapshot()` branch with a recursive `readDeep(value)` walk that calls every leaf signal inline. This registers the parent snapshot computed as a direct subscriber to every leaf signal across the entire composed tree.

Sketch:

- Internal helper `readDeep(node, initialNode, out)`. Either defined inside `createStore` closure, or extracted to `lib/utils.ts` if it stays shared and pure.
- Walks `Object.keys(node)`, skipping `reservedKeys`.
- For each key:
  - Original value was a function (`isFunction(initialNode[key])`): copy the original function reference.
  - Value is an object with own `snapshot` / `update` / `cleanup` (nested store via the `isStore` shape check already in `lib/utils.ts:26-33`): recurse via `readDeep(value, initialValue, out[key] = {})`.
  - Value is any other function (leaf signal): call inline `value()` to register the dependency, assign the returned value to `out[key]`.
  - Everything else: assign as-is.

The outer `snapshotComputed` calls `readDeep(result, initial, snapshotObj)` and returns `snapshotObj`.

Hot path optimizations (user-requested):

- Cache `Object.keys(result)` once per `createStore` invocation — the key set is stable because `update()` cannot introduce new keys (per `lib/utils.ts:48-63` early-return on missing target and AGENTS.md non-obvious-behaviors). Store the cached array on the closure; do not recompute per snapshot run.
- Reuse the cached `while` loop with cached `len` per `guides/code.md` Loops — materialize the key array once at store construction.
- Build the snapshot object in place — no intermediate allocations per recursion level beyond the result `out[key]` objects.
- The `readDeep` recursion is necessary for correctness (each leaf must be read inside the parent computed) but adds work proportional to total leaf count. Document the escape hatch in `docs/api/store.mdx`: for wide stores, read individual signals in effects for targeted reactivity instead of calling `snapshot()`.

Backward compatibility: **breaking change**. `tests/nested.test.ts:140-155` ("snapshot is not deeply reactive across composed stores") must be flipped to assert the new reactive behavior. The Code DoD item "Backward compatible, OR a changeset exists" requires a changeset at `.changeset/*.md`.

Cited evidence: `file` `lib/create.ts:38-59` (snapshot computed); `file` `lib/create.ts:51-52` (nested-store branch captures value, not dependency); `test` `tests/nested.test.ts:140-155` ("snapshot is not deeply reactive across composed stores"); `comparison` §5 Snapshot & Derivation ("real limitation, verified by `tests/nested.test.ts`"); `comparison` §10 Bottom Line ("a snapshot that does not stay reactive across composed-store boundaries"); `file` `lib/utils.ts:26-33` (existing `isStore` shape check).

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] Flip nested snapshot test and add composed-reactivity coverage (Tests)
**Solution:**
Edit `packages/store/tests/nested.test.ts:140-155` — rename the test from "snapshot is not deeply reactive across composed stores" to "snapshot is reactive across composed stores" and flip the assertion: after `userStore.name("Bob")`, the effect that read `appStore.snapshot()` must have run twice (initial plus the inner-store mutation). The effect's `mock()` tracker should assert `toHaveBeenCalledTimes(2)`.

Add additional coverage in `packages/store/tests/snapshot.test.ts`:

- Deeply nested composed stores (three levels): innermost leaf mutation fires the outermost snapshot effect.
- Composed stores with array leaves: the inner array signal is read inline; pushing a new element through `update(draft => draft.items.push(x))` fires the outer snapshot effect.
- Composed readonly stores: the readonly computed wrap is still a function — calling it inside `readDeep` still registers the dependency, so reactivity is preserved.

Cited evidence: `test` `tests/nested.test.ts:140-155` (existing test to flip); `test` missing — no positive test today for cross-store snapshot reactivity.

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (the `readDeep` algorithm in `lib/create.ts` or `lib/utils.ts`)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Update docs and comparison for new snapshot behavior (Docs)
**Solution:**
Update `packages/store/docs/api/store.mdx` snapshot section — remove the composed-store limitation callout (if any), add a positive example showing cross-store reactivity, and expand the existing Performance warning to cover the wider dependency footprint of composed snapshots.

Update `packages/store/AGENTS.md` and `packages/store/CLAUDE.md` if any text in those files describes the old non-reactive behavior (scan both files; they hold duplicate instruction content).

Update `packages/store/store-comparison.md`:

- §5 Snapshot & Derivation table — change the HellaJS Reactivity cell from "Reactive within a single store; not across composed stores" to "Reactive across the full composed tree".
- §5 prose — remove the paragraph describing the limitation.
- §10 Bottom Line — remove "a snapshot that does not stay reactive across composed-store boundaries" from the gaps list.

Cited evidence: `file` `docs/api/store.mdx` snapshot section; `file` `packages/store/store-comparison.md:108-121` (§5); `file` `packages/store/store-comparison.md:262-274` (§10 Bottom Line).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
