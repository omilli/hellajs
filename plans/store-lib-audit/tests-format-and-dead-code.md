## [ ] tests format — semicolons, indentation, no-op mock body, dead statement
**Type:** Tests

### Depends On
- None

### Objective
Every file in `packages/store/tests/` follows `./guides/tests.md` for semicolons, describe nesting indentation, mock body shape, and contains no dead statements.

### Solution
Mechanical edits across five files. No test is renamed, removed, or has its assertions changed.

**Add trailing semicolons.** The guide says *"Semicolons always"*. Five of eight test files are missing them at virtually every statement:
- `data.test.ts` — entire file (e.g. line 2 `import { store } from "@hellajs/store/bundle"` has no `;`, line 17 `})` no `;`, line 19 `expect(...).toBe(42)` no `;`).
- `nested.test.ts`, `readonly.test.ts`, `reserved.test.ts`, `update.test.ts` — same pattern.

The three files that already use semicolons (`cleanup.test.ts`, `middleware.test.ts`, `snapshot.test.ts`) are not touched.

**Fix describe indentation.** Every affected file opens two `describe` blocks at the same column:
```ts
describe("store", () => {
describe("cleanup", () => {
  test(...)
});
});
```
The inner `describe` and its closing `});` must be indented one level inside the outer `describe`. The `test(...)` bodies stay at their current indentation.

**Fix the no-op mock body in `data.test.ts:82`.** Current:
```ts
const tracker = mock((_value: number) => { _value })
```
The body evaluates and discards `_value`. A call-tracking mock should have an empty body:
```ts
const tracker = mock((_value: number => {});
```
Keep the `_value` parameter (it documents the call signature) and add the missing semicolon. The same shape appears in `data.test.ts:83` (`effect(() => { tracker(data.double()) })` — missing `;`).

**Remove dead statement in `update.test.ts:178-182`.** Current:
```ts
data.update(draft => {
  draft.items[0]
  draft.count = 10
})
```
`draft.items[0]` is a read with no effect; it tests nothing. The test's intent is "unchanged arrays do not trigger updates". Replace the dead line with a comment that names the intent:
```ts
data.update(draft => {
  // Access items without mutating — count change is the only write
  draft.count = 10;
});
```

Trade-offs: none. These are the project's house style.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on `packages/store/dist/bundle.js` (unchanged from baseline)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md` is introduced or left in place in the edited files
- [ ] Every edited test still asserts a behavior the source actually exposes — cross-checked against `packages/store/lib/`
- [ ] Do all five files (`data`, `nested`, `readonly`, `reserved`, `update`) pass `eslint .` with the `semi` rule?
- [ ] Does every `describe` block in the edited files nest its inner `describe` one indentation level deeper than the outer?
- [ ] Does `rg "\\{ _value }" packages/store/tests/` return zero matches?
- [ ] Does `packages/store/tests/update.test.ts` no longer contain a bare `draft.items[0]` statement?
