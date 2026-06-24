## [ ] Add resetRouter nuke
**Type:** Code

### Depends On
- None

### Objective
`@hellajs/router` exports a `resetRouter()` factory-reset that restores the singleton route state and detaches history/hashchange listeners — a real-world nuke (session reset, HMR, return-to-home), not a test hook.

### Solution
Per `packages/router/AGENTS.md`, `lib/state.ts` holds seven singleton signals (routes, hooks, redirects, notFound, mode, scrollBehavior, previousPath) and re-running `router()` removes prior history/hashchange listeners. `resetRouter()` must factory-reset all of that without touching the browser URL (external state — resetting it triggers navigation; tests that need a path call `navigate()`).

Add `packages/router/lib/resetRouter.ts` exporting `resetRouter(): void`. Read `lib/router.ts` and `lib/state.ts` and identify: the listener-detach path already used on re-init (reuse it — do not duplicate), and the seven signals' default values (re-write each to its default through the same setter path `router()` uses, batched if the signals are batchable). If re-running `router({})` with an empty config already achieves exactly this, `resetRouter()` may delegate to it; otherwise implement the reset directly against the seven signals + the listener-detach helper. Do not mutate `window.location` or `history`.

Export from `lib/index.ts`. New public symbol, non-breaking → minor changeset for `@hellajs/router`.

```ts
import { resetRouter } from "@hellajs/router";
// Session reset / HMR:
resetRouter(); // singleton signals back to defaults + listeners detached; URL untouched
```

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Solution includes a runnable code example for `resetRouter` (above)
- [ ] `resetRouter` has JSDoc; any new `@internal` helper it introduces has JSDoc
- [ ] `resetRouter` does not mutate `window.location` or `history` (verified by reading the implementation)
- [ ] A changeset exists at `.changeset/*.md` declaring `minor` for `@hellajs/router`
- [ ] Audit skill run on `resetRouter.ts` and `index.ts` reports no deviations from `./guides/code.md`
