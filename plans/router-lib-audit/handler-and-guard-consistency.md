## [ ] Handler any and isRouteObject consistency
**Type:** Code

### Depends On
- Size refactor

### Objective
The `Handler` type either uses `any` with an in-code justification (not just a lint suppression) or is narrowed, and the `isRouteObject` guard is used consistently by every `extract*` helper that currently hand-casts through `isPlainObject`.

### Solution
Runs after `size-refactor` so the `extract*` helpers live in `internal/extract.ts`. Two related consistency cleanups; pick the recommended path for each.

`Handler` (`types.d.ts:24-25`):
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (...args: any[]) => any;
```
The audit flagged this against guide § Types ("Never use `any`"). Recommended path: **keep `any` but justify it in code**, because handlers receive route params of arbitrary shape and return anything (including `Promise<void>` for async hooks) — narrowing to `(...args: unknown[]) => unknown` would force every call site and every test handler to cast, harming DX with no runtime benefit (handlers are invoked dynamically from route resolution). Replace the bare eslint-disable with a JSDoc block explaining the variance, and keep the disable:
```typescript
/**
 * Generic route handler / hook. Variadic and untyped by design: route params
 * and query are passed positionally with shapes determined by the matched
 * route pattern, and hooks may return Promises that the executor awaits.
 * Kept as `any` (not `unknown`) so call sites need no casts; the eslint
 * disable is intentional.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (...args: any[]) => any;
```
The guide's "never `any`" rule is upheld as the default; this becomes a documented, reviewed exception with a real reason in the code, not a silent suppression.

`isRouteObject` usage — `isRouteObject` (`utils.ts:27`) is a clean `value is RouteWithHooks` guard, but only `extractHandler` uses it. `extractMeta`, `extractScroll`, and `extractRouteHooks` (now in `internal/extract.ts`) each call `isPlainObject(...)` then hand-cast with `(routeValue as RouteWithHooks)`. Refactor those three to use `isRouteObject(routeValue)` so the cast disappears and the guard is the single source of narrowing. If any of the three legitimately needs the wider `isPlainObject` semantics (it does not — `isRouteObject` is exactly `isPlainObject`), keep `isPlainObject` and explain why in a one-line comment.

Trade-offs: the `Handler` decision is a judgment call. The recommended path (justify-in-place) preserves DX and is honest about the exception; the alternative (narrow to `unknown`) is purer but ripples through every test and call site. The `isRouteObject` change is pure cleanup — fewer casts, one guard.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — `Handler` stays structurally `(...args: any[]) => any`; the `isRouteObject` refactor is type-level only
- [ ] Audit skill on `types.d.ts` and `internal/extract.ts` reports no deviations from `./guides/code.md`
- [ ] Does the `Handler` JSDoc in `types.d.ts` contain a sentence explaining why `any` is intentional?
- [ ] Do `extractMeta`, `extractScroll`, and `extractRouteHooks` in `internal/extract.ts` use `isRouteObject(...)` for narrowing (no bare `as RouteWithHooks` casts after an `isPlainObject` check)?
