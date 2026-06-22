## [ ] Tighten cssVars input types to reject invalid leaf values

### Depends On
None

### Objective
`cssVars()` and `cssVarsRemove()` reject leaf values that are not `string`, `number`, or a reactive function (signal / computed / plain function returning string or number) at compile time, closing the type-safety gap identified in `css-comparison.md` section 7.

### Sub-tasks

#### [ ] Strict CSSVar input types (Code)
**Solution:**
The current constraint on `cssVars` is `T extends Record<string, unknown>` (`lib/vars.ts:46`), which accepts any leaf value including booleans and non-nested objects. Tighten it with a recursive input type.

Add to `lib/types.d.ts`:

```typescript
type CSSVarLeaf = string | number | ((...args: never[]) => string | number);

interface CSSVarInputObject {
  [key: string]: CSSVarLeaf | CSSVarInputObject;
}
```

`CSSVarLeaf` accepts strings, numbers, and functions returning `string | number`. The `(...args: never[]) => string | number` signature is contravariant in parameters, so it accepts HellaJS signals (`Signal<string>` = `(val?: string) => string`), computed values, and plain functions. It rejects functions returning `boolean` or `object`.

Change the constraint in `lib/vars.ts`:
- `cssVars<T extends Record<string, unknown>>` becomes `cssVars<T extends CSSVarInputObject>`
- `cssVarsRemove<T extends Record<string, unknown>>` becomes `cssVarsRemove<T extends CSSVarInputObject>`

Update the `CSSVars<T>` mapped type in `lib/types.d.ts` to match the new constraint:
- `T[K] extends Record<string, unknown> ? CSSVars<T[K]> : string` becomes `T[K] extends CSSVarInputObject ? CSSVars<T[K]> : string`

Export `CSSVarLeaf` and `CSSVarInputObject` from `lib/index.ts` (via `export type * from "./types"` — they are already covered by the existing wildcard export, just ensure they are defined in `types.d.ts`).

This is a breaking type-level change: callers passing `boolean`, `object` (non-nested), or other invalid leaf values will get compile-time errors where they previously did not. The runtime behavior is unchanged — `cssVars` already calls `String()` on values, so `true` became `"true"` at runtime. The type change catches these cases at compile time.

Ship as a breaking changeset (`@hellajs/css` major or minor bump per semver).

Key decisions:
- `CSSVarLeaf` uses `(...args: never[]) => string | number` to accept any function arity (signals take an optional setter argument; plain functions take zero arguments).
- The type is deliberately strict about return types (`string | number`) — functions returning `boolean` or `object` are rejected. Users with boolean signals must convert explicitly: `() => flag() ? '1' : '0'`.

**Definition of Done:**
- [ ] `bun check css` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency
- [ ] A changeset exists at `.changeset/*.md` describing the breaking type-level change
- [ ] Audit skill run on `lib/types.d.ts`, `lib/vars.ts`, `lib/index.ts` reports no deviations from `./guides/code.md`

#### [ ] Type-level regression tests (Tests)
**Solution:**
Add type-level assertions to `tests/cssvars.test.ts` in a new `describe("type safety")` block.

Use `@ts-expect-error` annotations (following the existing pattern in `tests/cssvars.test.ts:391-394`) to verify that invalid leaf values produce compile-time errors. Each `@ts-expect-error` is self-checking: if the type error does NOT occur, TypeScript reports an "unused @ts-expect-error" directive error.

Cases to cover:
- `cssVars({ flag: true })` — boolean leaf rejected. The runtime call still executes (producing `--flag: true`); the `@ts-expect-error` verifies the type error exists.
- `cssVars({ data: { active: false } })` — boolean in nested object rejected.
- `cssVars({ item: { x: 1, y: 2 } })` — `{ x: 1, y: 2 }` is a valid nested object under the new type (both leaves are numbers), so this compiles. Use `cssVars({ date: new Date() })` instead — a `Date` instance is neither `CSSVarLeaf` (not string/number/function) nor `CSSVarInputObject` (not a plain object with string-indexed leaves of the right shape), so it is rejected.
- `cssVars({ fn: () => true })` — function returning boolean rejected.
- `cssVars({ valid: 'string' })` — no error (verify valid input still compiles without `@ts-expect-error`).
- `cssVars({ valid: 42 })` — no error.
- `cssVars({ valid: () => 'value' })` — no error.
- `cssVars({ valid: { nested: 'value' } })` — no error.

Also add a positive type assertion: assign the return value of `cssVars` to a variable and verify the leaf type is `string` via a type helper (e.g., `const vars = cssVars({ color: 'red' }); const leaf: string = vars.color;`).

Follow existing test conventions: `resetTestState()` + `cssReset()` + `cssVarsReset()` in `beforeEach`, import from `@hellajs/css/bundle`.

**Definition of Done:**
- [ ] `bun check css` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines in `lib/types.d.ts` (no runtime change, but coverage must not regress)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Document CSSVarLeaf and CSSVarInputObject in cssvars.mdx (Docs)
**Solution:**
`CSSVarLeaf` and `CSSVarInputObject` are re-exported from `lib/index.ts` (covered by the existing `export type * from "./types"`), so they are public type surface. Per `./guides/docs.md`, exports from `index.ts` are documented. Add a `### Accepted value types` sub-section under `## Key Concepts` in `docs/api/cssvars.mdx` explaining:

- The accepted leaf types: `string`, `number`, and functions returning `string | number` (signals, computed, plain getters).
- That `boolean`, `Date`, and other object leaves are rejected at compile time.
- A `❌`/`✅` example showing a boolean signal converted explicitly: `() => flag() ? '1' : '0'`.

Add the type signatures to the existing `## API` signature block so the documented types match `index.ts` exactly (per the Type Accuracy rule in `./guides/docs.md`).

Note any breaking type-level impact in the doc's `## Important Considerations` section under `### Boolean and object leaves rejected` so users migrating from the untyped `Record<string, unknown>` shape know what to change.

**Definition of Done:**
- [ ] Every code example in the changed file compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` was followed (no new sections invented)
- [ ] Package docs (`packages/css/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed doc contradicts the implementation — cross-checked against `lib/types.d.ts` and `lib/vars.ts`
- [ ] Type signatures shown in the doc match the actual exported types from `lib/index.ts`
