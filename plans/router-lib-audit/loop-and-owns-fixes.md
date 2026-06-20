## [ ] Loop and owns-check fixes
**Type:** Code

### Depends On
- In-place style fixes

### Objective
`packages/router/lib/` contains no `for...of` or `for...in` loops and uses `Object.hasOwn` for own-property checks, matching `./guides/code.md` § Loops and § Types.

### Solution
Replace every `for...of` / `for...in` with the house cached-`while` pattern (`navigate.ts:20-25` is the in-package reference). Behavior is preserved exactly.

`match.ts`:
- `:14` `for (const part of queryString.replace(/^\?/, "").split("&"))` — split once into a `parts` array, then `let i = 0; const len = parts.length; while (i < len) { const part = parts[i++]!; ... }`.
- `:89` `for (const [pattern, routeValue] of routeEntries)` — index `routeEntries` (already an array from `.filter().sort()`) with `let i = 0; const len = routeEntries.length; while (i < len) { const [pattern, routeValue] = routeEntries[i++]!; ... }`.
- `:44` `for (let i = 0; i < baseLength; i++)` — opportunistic normalization to the house `while (i < len)` form while this file is open (per the `guide-numeric-for-clarification` task's intended wording: the while form is the house style). Keep the non-null assertions on `patternParts[i]!` / `pathParts[i]!`.

`utils.ts`:
- `:173` `for (const redirect of globalRedirects)` — `let i = 0; const len = globalRedirects.length; while (i < len) { const redirect = globalRedirects[i++]!; ... }`. Note the body is a single `if` with an early `return`; preserve that.
- `:186` `for (const [pattern, value] of Object.entries(routeMap))` — `const entries = Object.entries(routeMap); let i = 0; const len = entries.length; while (i < len) { const [pattern, value] = entries[i++]!; ... }`.
- `:195` `for (const [pattern, routeValue] of routeEntries)` — same pattern over the already-sorted `routeEntries` array.
- `:220` `for (const pattern in routeMap)` — **`for...in`**, banned for both iterator allocation and prototype-chain traversal. Convert to `const patterns = Object.keys(routeMap); let i = 0; const len = patterns.length; while (i < len) { const pattern = patterns[i++]!; const routeValue = routeMap[pattern]!; ... }`.
- `:334` `for (const { routeValue, params, query } of nestedMatches)` — index `nestedMatches` with `let i = 0; const len = nestedMatches.length; while (i < len) { const { routeValue, params, query } = nestedMatches[i++]!; ... }`.
- `:340-345` reverse `for (; i >= 0; i--)` — already a numeric counted loop (no iterator), but normalize to a `while (i >= 0) { ...; i--; }` form for consistency with the house style. Keep the reverse direction (LIFO after-hook order).

Owns-check — `utils.ts:295` `if (isPlainObject(routeValue) && 'scroll' in routeValue)` uses the banned `in` operator AND single quotes. Replace with `if (isPlainObject(routeValue) && Object.hasOwn(routeValue, "scroll"))`.

Trade-offs: `Object.keys`/`Object.entries` allocate once per call site; this is the documented, preferred amortization over per-iteration iterator objects (guide § Loops). None of these loops are hot enough to warrant in-place cursor tricks.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — runtime behavior unchanged (loop semantics identical; `for...in` over plain object literals yields the same keys as `Object.keys`)
- [ ] Audit skill run on `packages/router/lib/match.ts` and `packages/router/lib/utils.ts` reports no deviations from `./guides/code.md` for loops and owns-checks
- [ ] Does `rg "for\s*\(\s*const.*\bof\b" packages/router/lib/` return no matches?
- [ ] Does `rg "for\s*\(\s*const.*\bin\b\s+\w" packages/router/lib/` return no matches?
- [ ] Does `rg "\bin\s+\w" packages/router/lib/utils.ts` return no matches outside comments (no `'x' in obj` own-property checks)?
- [ ] Does `Object.hasOwn(routeValue, "scroll")` appear in `utils.ts`?
