## [ ] In-place style fixes
**Type:** Code

### Depends On
- None

### Objective
Every file in `packages/store/lib/` passes the audit skill against `./guides/code.md` for mechanical style (`@internal` tags, `Object.hasOwn`, loop form, arrow parens, semicolons, JSDoc on locals) without any structural moves, signature changes, or behavior change.

### Solution
Mechanical edits only. No function moves, no signature changes, no behavior change. Touches `internal/core.ts`, `create.ts`, `draft.ts`, `utils.ts`. The `createStore` length issue and the `store` → `createStore` wrapper are handled in separate tasks (`createstore-size-refactor`, `guide-wrapper-overload-carveout`).

`@internal` tags — add to every symbol exported from its module but NOT re-exported by `index.ts` (barrel exports only `store` and the types). Targets missing the tag:
- `create.ts:14` `createStore` — merge `@internal` into the existing JSDoc block as the first tag line, keep the prose.
- `utils.ts:5` `reservedKeys`, `:12` `isObject`, `:21` `isStore`, `:35` `isObjectOrFunction` — same treatment. `applyUpdate` (`:42`), `wrapWithMiddleware` (`:64`), `defineStoreProperty` (`:75`) already carry `@internal` — leave them.

JSDoc on local symbol — `draft.ts:68` `arrayEqual` is declared without `export` but the guide still requires JSDoc on locals. Add a block matching its existing siblings (`/** Reference-equality check for arrays element-by-element. Objects inside arrays must be replaced (not mutated) to register as changed. */` — promote the current inner comment).

`Object.hasOwn` — replace every `"x" in obj` own-property check and every `Object.prototype.hasOwnProperty.call(obj, key)` with `Object.hasOwn(obj, key)`. Targets:
- `create.ts:46` `"snapshot" in value` → `Object.hasOwn(value, "snapshot")`.
- `create.ts:71` `"update" in current` → `Object.hasOwn(current, "update")`.
- `create.ts:88` `"cleanup" in value` → `Object.hasOwn(value, "cleanup")`.
- `utils.ts:23-25` `isStore` — `"snapshot" in value`, `"update" in value`, `"cleanup" in value` → `Object.hasOwn(value, "...")`. The methods are defined on the instance via `defineStoreProperty`, so `hasOwn` is the correct own-property check; the duck-type over the prototype chain is not intended (no store subclassing exists).
- `draft.ts:13` `Object.prototype.hasOwnProperty.call(obj, key)` → `Object.hasOwn(obj, key)`.
- `draft.ts:32` `Object.prototype.hasOwnProperty.call(draft, key)` → `Object.hasOwn(draft, key)`.

Loop form — convert `for...in` / `for...of` / non-cached C-style `for(;;)` to cached `while`. Materialize keys once with `Object.keys()` (or `Object.entries()`) and iterate by index.
- `draft.ts:10` — `obj.map(item => deepClone(item))` → `obj.map((item) => deepClone(item))` (arrow-paren rule, separate from the loop fix but same line).
- `draft.ts:12-16` `for (const key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) ... }` — collapse to a cached `while` over `Object.keys(obj)`. The `hasOwn` filter becomes unnecessary once we iterate own keys.
- `draft.ts:31-58` `for (const key in draft) { if (!Object.prototype.hasOwnProperty.call(draft, key)) continue; ... }` — same treatment: `const keys = Object.keys(draft); let i = 0; const len = keys.length; while (i < len) { const key = keys[i]; ... i++; }`.
- `draft.ts:70` `for (let i = 0; i < a.length; i++)` → canonical cached `while` (`const len = a.length; let i = 0; while (i < len) { ... i++; }`).
- `create.ts:39` `for (const key of Object.keys(result))` — cached `while` over `Object.keys(result)`.
- `create.ts:69` `for (const [key, value] of Object.entries(resolvedPartial as Record<string, unknown>))` — cached `while` over `Object.entries(resolvedPartial as Record<string, unknown>)` with destructuring at the top of the loop body.
- `create.ts:84` `for (const key in obj)` — cached `while` over `Object.keys(obj)`. Note: switching from `for...in` to `Object.keys()` here also tightens semantics (own properties only); the recursive traversal intentionally skips the prototype chain.
- `create.ts:99` `for (const [key, value] of Object.entries(initial))` — cached `while` with `Array.from(Object.entries(initial))` (the AGENTS.md `Array.from` amortization note applies because this is the recursive hot path).

Arrow-paren rule — `draft.ts:10` `item => deepClone(item)` → `(item) => deepClone(item)`. Scan all other single-param arrows in the directory and parenthesize; this is the only current offender.

Semicolons — `internal/core.ts:1-2` are missing trailing semicolons:
```
export { signal, computed, isFunction, isPlainObject } from "@hellajs/core"
export type { Signal } from "@hellajs/core"
```
Add `;` to both lines.

Trade-offs: none. This is the project's house style. Every edit is mechanical and behavior-preserving. The `Object.hasOwn` swap for `isStore` is technically a semantic narrowing (own properties only, no prototype chain), but no store in the codebase is constructed via prototype inheritance, so the duck-type result is unchanged.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — public API surface and runtime behavior unchanged
- [ ] Audit skill run on `packages/store/lib/` reports no deviations from `./guides/code.md` for `@internal` tags, `Object.hasOwn`, loop form, arrow parens, semicolons, and JSDoc on locals
- [ ] Does `rg "@internal" packages/store/lib/` find at least 8 matches (1 in create.ts, 7 in utils.ts)?
- [ ] Does `rg "Object\.prototype\.hasOwnProperty" packages/store/lib/` return zero matches?
- [ ] Does `rg '"(snapshot|update|cleanup)" in ' packages/store/lib/` return zero matches?
- [ ] Does `rg "for \(\w+ in \w" packages/store/lib/` return zero matches?
- [ ] Does `rg "for \(const \[\w+," packages/store/lib/` return zero matches (no `for...of` over entries)?
- [ ] Does `rg "for \(let i = 0; i < \w+\.length; i\+\+\)" packages/store/lib/` return zero matches (no non-cached C-style for loops)?
- [ ] Does `internal/core.ts` consist of two `export ... ;` lines each ending in a semicolon?
- [ ] Does `rg "\b\w+ => " packages/store/lib/draft.ts` return zero single-param unparenthesized arrows (i.e., does `(item) =>` appear rather than `item =>`)?
