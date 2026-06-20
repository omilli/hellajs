## [ ] createStore size refactor
**Type:** Code

### Depends On
- in-place-style-fixes

### Objective
`createStore` in `packages/store/lib/create.ts` is under 80 lines of body, satisfying the guide's hard function-size limit without introducing single-callsite helpers under 30 lines.

### Solution
`create.ts:27-135` currently weighs ~108 lines of body against the guide's 80-line limit (§ File and Function Size: "Functions: Under 80 lines. If a function exceeds 80 lines, look for natural split points"). The body splits cleanly along the three responsibilities the AGENTS.md already names: snapshot wiring, method assignment, and property initialization.

Single split — extract the property-initialization loop (currently lines 99-132, 34 lines, single callsite) into a co-located internal helper. This block qualifies for extraction under the guide's carveout: "Never extract a function called from exactly one callsite unless it exceeds 30 lines" — it exceeds 30. The other two candidate blocks (`snapshotComputed`, `update`/`cleanup` method assignments) are each under 30 lines and must stay inline.

Proposed shape:
- `initStoreProperties(result, initial, readonlyAll, readonlyKeys, middlewares)` — walks `Object.entries(initial)` via cached `while`, dispatches each value to `defineStoreProperty` (function / nested store / signal-with-optional-readonly-wrap). Returns `void`; mutates `result` in place (allowed: hot-path internal state, direct mutation per § Mutation vs Immutable).
- `createStore` keeps options destructuring, `result` allocation, `snapshotComputed`/`update`/`cleanup` inline (they close over `result` and `initial`), the `initialIsStore` check, and a single `initStoreProperties(...)` call.

This brings `createStore` to roughly 65-70 lines of body. The helper is exported with `@internal` (it is internal to the package, not re-exported by `index.ts`) — or, if preferred for coupling, declared without `export` and kept local to `create.ts` (in which case it still needs JSDoc but not `@internal`). Local is preferred: nothing else in `lib/` consumes it.

Trade-offs: extracting the largest chunk is the minimal split that clears 80 lines. Going further (extracting snapshot or method builders) would violate the single-callsite rule for sub-30-line blocks and harm clarity by spreading the store-construction recipe across many tiny helpers. The chosen split keeps the recipe readable top-to-bottom in `createStore` and isolates only the genuinely separable property-init traversal.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — public API surface and runtime behavior unchanged
- [ ] Audit skill run on `packages/store/lib/create.ts` reports no deviations from `./guides/code.md`
- [ ] Does `createStore`'s function body (lines between the opening `{` and closing `}` of `create function createStore`) measure 80 lines or fewer?
- [ ] If a helper was extracted, is it either (a) not exported and under 80 lines, or (b) exported with `@internal` and under 80 lines?
- [ ] Does `bun test` for the store package pass with the same number of tests as before this task?
