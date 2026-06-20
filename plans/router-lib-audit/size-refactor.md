## [ ] Size refactor — extract helpers and split updateRoute
**Type:** Code

### Depends On
- In-place style fixes
- Loop and owns-check fixes

### Objective
`packages/router/lib/utils.ts` is under the 300-line file limit and `updateRoute` is under the 80-line function limit, achieved by moving cohesive helper clusters into new internal modules and splitting the five resolution phases into named functions — with no change to runtime behavior or the public API.

### Solution
Runs after the style and loop passes so the refactored code is already conformant. Behavior-preserving; no signature changes to `router`, `route`, `navigate`, `go`, or `updateRoute`.

Extract `internal/extract.ts` — move the four `extract*` helpers out of `utils.ts`:
- `extractHandler` (currently `utils.ts:268`)
- `extractMeta` (`:283`)
- `extractScroll` (`:294`)
- `extractRouteHooks` (`:305`)
These are pure functions over `unknown` route values with no dependency on router state. Move them verbatim (with their JSDoc) into `internal/extract.ts`, export each with `@internal`, and update `utils.ts` to import them. `isRouteObject` (`utils.ts:27`) stays in `utils.ts` for now (it is consumed by `match.ts` via the existing export); the consistency cleanup of `isRouteObject` usage is handled by the `handler-and-guard-consistency` task.

Extract `internal/scroll.ts` — move `handleScroll` (currently `utils.ts:107-155`) into `internal/scroll.ts`. It reads `previousPath` and `scrollBehavior` from `./state` and `hasWindow`/`isFunction` from `./internal/core` — all stable imports, so the move is mechanical. Export with `@internal`.

Split `updateRoute` (currently `utils.ts:162-261`, ~100 lines) into five phase functions, each returning `{ handled: true } | false` (or void + a sentinel) so `updateRoute` becomes a short top-level dispatcher:
- `resolveGlobalRedirects(currentPath): boolean` — phase 1 (`:170-176`), returns true if a redirect `go(...)` fired.
- `resolveStringRedirects(currentPath): boolean` — phase 2 (`:185-188`).
- `resolveNested(currentPath, inlineScroll, mergeMeta): boolean` — phase 3 (`:191-217`). Takes the inline-scroll and meta-merge inputs needed by the body.
- `resolveFlat(currentPath, inlineScroll, mergeMeta): boolean` — phase 4 (`:220-242`).
- `resolveNotFound(currentPath, inlineScroll, inlineMeta): void` — phase 5 (`:245-260`).

The `mergeMeta` closure currently defined inline inside `updateRoute` (`:182-183`) moves to module scope as `@internal mergeMeta(routeMeta, inlineMeta)` so the phase functions can share it. After the split, `updateRoute` reads `route().path`, builds `mergeMeta`, and calls the five phases in order with early `return` on a truthy result — under 30 lines.

The phase functions are each called from exactly one callsite (`updateRoute`), which would normally trigger the no-single-use rule. Guide exception: *"Never extract a function called from exactly one callsite unless it exceeds 30 lines"* — but here the extraction is to bring `updateRoute` itself under the 80-line limit, which is the higher-precedence rule. Each phase is also a cohesive named step that improves reviewability. Document this trade-off in a one-line comment at the dispatcher.

Trade-offs: more files, but each under 80 lines and singly-responsible. No allocation added; the phase functions take their inputs as parameters rather than closing over locals, which is slightly more verbose but keeps them pure and testable.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — public API surface and runtime behavior unchanged; the 79 existing tests pass unmodified
- [ ] Audit skill run on `packages/router/lib/utils.ts`, `internal/extract.ts`, and `internal/scroll.ts` reports no deviations from `./guides/code.md`
- [ ] Is `packages/router/lib/utils.ts` 300 lines or fewer?
- [ ] Is the `updateRoute` function body 80 lines or fewer?
- [ ] Do `internal/extract.ts` and `internal/scroll.ts` each exist and export only `@internal` symbols?
- [ ] Do all 79 existing router tests still pass with no modifications?
