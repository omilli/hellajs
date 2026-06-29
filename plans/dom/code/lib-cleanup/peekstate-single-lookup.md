# [ ] peekstate-single-lookup

## Contract

### Surface change
no — internal hot-path optimization. `hasState` remains exported (still used by `queue.ts`, `selectors.ts`); only the three violating call sites change.

### Package
dom

### Guide governance
- Files ← `code.md` §Memory (lazy `ElementState` collections, WeakMap semantics), §Performance
- Behavioral scenarios ← none (no behavior change; existing lifecycle / event / boundary tests cover)

### Root cause (evidence)
`AGENTS.md:224` mandates: *"Single WeakMap lookup on hot guards — `peekState(node)?.field` replaces the `hasState` + `getState` double-lookup in `appendToParent`'s boundary check and in `delegatedHandler`'s per-path-element walk."* Three call sites still do the double-lookup:

1. `lib/internal/cleanup.ts:36-41` — `clean(node)`:
   ```ts
   if (!hasState(node)) return;
   const state = getState(node);
   ```
   Two WeakMap probes on every descendant visited during cleanup. Hot path.

2. `lib/internal/reactive.ts:46` — `hooks` method's immediate `afterMount` fire:
   ```ts
   type === "afterMount" && hasState(element) && getState(element).isMounted && (fn as ElementMountFn)(element);
   ```

3. `lib/internal/dispatch.ts:81-83` — `findBoundary` cache write:
   ```ts
   if (hasState(origin)) {
     getState(origin).cachedBoundary = current;
   }
   ```

### Files
- `packages/dom/lib/internal/cleanup.ts` — modify `clean()`: replace the two-line pattern with `const state = peekState(node); if (!state) return;`. Drop `hasState` from the `./state` import (still imports `getState`, `deleteState`, `peekState`).
- `packages/dom/lib/internal/reactive.ts` — modify `hooks` method: replace `hasState(element) && getState(element).isMounted && …` with `peekState(element)?.isMounted && …`. Drop `hasState` from the `./state` import.
- `packages/dom/lib/internal/dispatch.ts` — modify `findBoundary`: replace the `if (hasState(origin)) { getState(origin).cachedBoundary = current; }` block with `const originState = peekState(origin); if (originState) originState.cachedBoundary = current;`. Drop `hasState` from the `./state` import.

### Tests view
No new tests. Existing coverage:
- `tests/lifecycle.test.ts` — `clean()` path (destroy cleanup, handler removal)
- `tests/ref.test.ts` / `tests/collection.test.ts` — `createReactive` `hooks` immediate-`afterMount` branch
- `tests/error-boundary.test.ts` — `cachedBoundary` write + invalidation

Per `tests.md` §Test Structure, no scenario added — this is a perf-only refactor with identical observable behavior.

### Docs view
None. `AGENTS.md:224` already documents the rule; bringing the three sites into compliance needs no doc change. (If anything, the rule's "in `appendToParent`'s boundary check and in `delegatedHandler`'s per-path-element walk" phrasing is now the complete list of compliant sites — leave as-is.)

---

## [ ] Apply peekState single-lookup convention (Code)
**Type:** Code
**Depends on:** None

### Strategy
Three parallel micro-edits sharing one rule and one transformation pattern (`hasState(x) + getState(x)` → `peekState(x)` with optional chaining). Each site is mechanical but must preserve exact semantics: in `clean()` the rest of the function reads `state.*` so `const state = peekState(node); if (!state) return;` is the natural shape; in `findBoundary` the write only happens if state exists, so binding `originState` once avoids the second probe. `hasState` import drops from each file because every remaining caller (queue.ts:46/144, selectors.ts:57) still wants the boolean form. Run `rg hasState packages/dom/lib` after the edit — the only hits should be the export in `state.ts`, the remaining three callers in `queue.ts`/`selectors.ts`, and the `AGENTS.md` export-table row.

### Definition of Done
- [ ] `bun coverage dom` exits 0
- [ ] `cleanup.ts:clean()` uses a single `peekState` lookup
- [ ] `reactive.ts:hooks` immediate-`afterMount` branch uses `peekState(element)?.isMounted`
- [ ] `dispatch.ts:findBoundary` cache-write uses a single `peekState` lookup
- [ ] `rg "hasState" packages/dom/lib/internal/cleanup.ts packages/dom/lib/internal/reactive.ts packages/dom/lib/internal/dispatch.ts` returns no matches
- [ ] `rg "hasState" packages/dom/lib` returns only: `state.ts` (export), `queue.ts` (2 call sites), `selectors.ts` (1 call site)
- [ ] Existing tests for cleanup / reactive-hooks / boundary-cache all still pass (subset of `bun coverage dom`)
