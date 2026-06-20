## [ ] In-place style fixes
**Type:** Code

### Depends On
- None

### Objective
Every file in `packages/router/lib/` passes the audit skill against `./guides/code.md` for mechanical style (`@internal` tags, quotes, semicolons, import dedup) without any structural moves, signature changes, or behavior change.

### Solution
Mechanical edits only. No function moves, no signature changes, no behavior change. Touches `index.ts`, `router.ts`, `state.ts`, `match.ts`, `navigate.ts`, `hooks.ts`, `utils.ts`, `types.d.ts`, `internal/core.ts`.

`@internal` tags — the audit found zero `@internal` markers in this package while siblings carry dozens. Add `@internal` to the JSDoc of every symbol that is `export`ed from its module but NOT re-exported by `index.ts` (the barrel exports only `router`, `route`, `navigate`, and the types). Targets:
- `state.ts`: `routes` (8), `hooks` (13), `redirects` (18), `notFound` (23), `mode` (28), `scrollBehavior` (33), `previousPath` (38). Leave `route` (43) untagged — it is in the barrel.
- `match.ts`: `matchNestedRoute` (78), `matchRoute` (132).
- `hooks.ts`: `executeHook` (12), `executeGlobalHook` (44).
- `utils.ts`: `EMPTY_OBJECT` (20), `isRouteObject` (27), `hasChildren` (35), `encode` (41), `decode` (46), `getHashPath` (52), `sortRoutesBySpecificity` (63), `go` (79), `updateRoute` (162).
- `router.ts` `router` and `navigate.ts` `navigate` are in the barrel — leave untagged.

Format: `/** @internal <existing one-line description.> */` — merge the tag into the existing block as the first tag line, keep the prose.

Quotes — convert every single-quoted string literal to double quotes (guide § Imports: "Double quotes for all imports and string literals"). Targets:
- `index.ts:1-4` — `from './router'`, `'./state'`, `'./navigate'`, `'./types'`.
- `types.d.ts:31` `'history' | 'hash'`; `:41-43` `'auto' | 'top' | 'preserve'`; JSDoc prose at `:9`, `:35-37`, `:90` (rewrite the quoted literals inside prose to double quotes).
- `utils.ts:132` `'auto'`, `:137` `'preserve'`, `:144` `'top'`, `:295` `'scroll'`.
Comments and template literals (backticks) are untouched.

Semicolons — `internal/core.ts:1-2` are missing trailing semicolons:
```
export { signal, isFunction, isString, isPlainObject } from "@hellajs/core"
export { hasWindow } from "@hellajs/core"
```

Import dedup — collapse duplicate imports from the same module into one statement per module:
- `router.ts:1-2` → `import { isFunction, hasWindow } from "./internal/core";`
- `state.ts:1-2` → `import { signal, hasWindow } from "./internal/core";`
- `utils.ts:1-2` → `import { isFunction, isPlainObject, isString, hasWindow } from "./internal/core";`
- `internal/core.ts:1-2` → `export { signal, isFunction, isString, isPlainObject, hasWindow } from "@hellajs/core";` (also satisfies the semicolon fix above).

Trade-offs: none. This is the project's house style. Note: `core/lib/internal/env.ts` has the same single-quote defect (`'undefined'`) but is out of scope for this plan — flagged for a separate core audit.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — public API surface and runtime behavior unchanged
- [ ] Audit skill run on `packages/router/lib/` reports no deviations from `./guides/code.md` for `@internal` tags, quotes, semicolons, and import dedup
- [ ] Does `rg "@internal" packages/router/lib/` find at least 19 matches (7 in state.ts, 2 in match.ts, 2 in hooks.ts, 8 in utils.ts)?
- [ ] Does `rg "'" packages/router/lib/` return matches only inside comments (no string literals)?
- [ ] Does `internal/core.ts` consist of a single `export { ... } from "@hellajs/core";` line with a trailing semicolon?
