## [ ] lib style fixes — drop stray `@internal`, replace side-effect ternary
**Type:** Code

### Depends On
- None

### Objective
`packages/store/lib/` has no audit deviations against `./guides/code.md` for `@internal` placement and the "no side-effect ternaries" rule.

### Solution
Two mechanical edits. No behavior change, no signature change.

**`draft.ts:71-75` — drop `@internal` from a non-exported function.** The guide says: *"`@internal` for symbols that are `export`ed from their module but not re-exported by the package's `index.ts` barrel. Symbols declared without `export` are purely local — they need JSDoc but not `@internal`."* `arrayEqual` is declared `function arrayEqual<T>(...)` (no `export`), so the `@internal` tag is wrong. The current block is:
```ts
/**
 * Reference-equality check for arrays element-by-element.
 * Objects inside arrays must be replaced (not mutated) to register as changed.
 * @internal
 */
function arrayEqual<T>(a: T[], b: T[]): boolean {
```
Remove the `@internal` line; keep the prose description.

**`create.ts:81-84` — replace side-effect ternary with `if/else`.** The guide says: *"Never use ternary for branches with side effects"*. The current statement-expression ternary dispatches to two calls with side effects:
```ts
(isPlainObject(value) && current && isObject(current) && Object.hasOwn(current, "update"))
  ? (current as unknown as Store<Record<string, unknown>>).update(value as object)
  : applyUpdate(current, value, middlewares, key as string);
```
Rewrite as:
```ts
if (isPlainObject(value) && current && isObject(current) && Object.hasOwn(current, "update")) {
  (current as unknown as Store<Record<string, unknown>>).update(value as object);
} else {
  applyUpdate(current, value, middlewares, key as string);
}
```

Trade-offs: none. Both edits are local and behavior-preserving.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — public API surface and runtime behavior unchanged
- [ ] Audit skill run on `packages/store/lib/draft.ts` and `packages/store/lib/create.ts` reports no deviations for the `@internal` placement rule and the side-effect ternary rule
- [ ] Does `rg "@internal" packages/store/lib/draft.ts` return zero matches (the function is not exported)?
- [ ] Does `packages/store/lib/create.ts` no longer contain a ternary operator whose branches are call expressions with side effects?
