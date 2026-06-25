# [ ] blocking-guards

## Contract

### Surface change
yes — the `navigate` export signature changes from `void` to `Promise<void>` (the `before` hook return contract also gains guard semantics via JSDoc, but no new type is added). Per `code.md` §`index.ts` Rules and §Package File Structure, a changed public signature on an `index.ts` re-export is a surface change. (The source feature described this as "no new hook name, no new type" — accurate for types, but the `navigate` return-type change is itself a public surface change.)

### Package
router

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Functions & Modules, §Error Handling, §Decision Precedence
- Public API delta ← `code.md` §`index.ts` Rules, §JSDoc
- Behavioral scenarios ← `tests.md` §Files, §File-naming for tests, §Test Structure, §Scenario → test() derivation, §Mock Patterns, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Concept Docs, §Pattern Docs

### Files
- `packages/router/lib/types.d.ts` — modify — JSDoc on `GlobalHooks.before` (`:95-100`) and `RouteWithHooks.before` (`:59-72`) documenting the new return contract; no new types
- `packages/router/lib/hooks.ts` — modify — new `runGuards(hookChain, params, query)` helper; the existing `executeHook` (`:13-41`) stays for the post-guard handler/`after` phase
- `packages/router/lib/utils.ts` — modify — reorder `tryMatchRoute` (`:177-256`) so guards run before the signal update at `:210-217` (nested) and `:242-248` (flat); make `tryMatchRoute`, `updateRoute` (`:94-124`), and `go` (`:66-86`) async; `go` returns a success boolean so `pushState` (`:79`) is gated until guards pass (option b)
- `packages/router/lib/navigate.ts` — modify — return type becomes `Promise<void>`; await `go`
- `packages/router/lib/router.ts` — modify — popstate/hashchange handler (`:48-59`) async; the `queueMicrotask(() => updateRoute())` wrapper (`:66`) stays
- `packages/router/lib/internal/matched.ts` — modify — `executeRouteWithHooks` (`:127-165`) drops the `before` execution steps (`:134-136`, `:138-147`, `:158-160`); only `handler` and `after` run post-guard; `executeGlobalHook(after, ...)` still runs last
- `packages/router/tests/hooks.test.ts` — modify — async-hook tests (`:124-145`) rewritten to await before asserting handler ran
- `packages/router/tests/errors.test.ts` — modify — throwing-`before` tests (`:23-64`) now assert navigation cancels
- `packages/router/tests/guards.test.ts` — create — guard scenario suite (see Behavioral scenarios)
- `packages/router/docs/concepts/routing.mdx` — modify — Route Guards section (`:202-231`) rewritten for the return contract
- `packages/router/docs/api/router.mdx` — modify — "Hook Returns" (`:272-274`, within `:251-274`) replaced with the guard contract
- `packages/router/docs/patterns/routing.mdx` — modify — Auth Guard pattern (`:52-75`) simplified to return-based guard
- `packages/router/AGENTS.md` — modify — Non-Obvious Behaviors "Hooks never block navigation" bullet + Hook Execution order (scoped edit; regenerated `CLAUDE.md` + `.github/instructions/*` via `bun sync`)

### Public API delta
```ts
// packages/router/lib/navigate.ts — before
export function navigate(to: string | NavigateTarget, options?: NavigateOptions): void;
// after
export function navigate(to: string | NavigateTarget, options?: NavigateOptions): Promise<void>;
```

`before` hook return contract (documented in JSDoc on `GlobalHooks.before` / `RouteWithHooks.before`; no new type):
- returns `void` / `undefined` / `true` / truthy non-string → proceed
- returns `false` → cancel (no signal update, no `pushState`, no handler, no scroll)
- returns `string` → redirect via `go(string, { replace: true })`
- returns `Promise<false | string | void>` → the pipeline awaits, then the rules apply to the resolved value

```ts
import { router, navigate } from "@hellajs/router";

router({
  hooks: { before: () => isLoggedIn() },           // void/truthy -> proceed
  routes: {
    admin: {
      before: () => isLoggedIn() || "/login",       // string -> redirect
      handler: () => renderAdmin(),
    },
  },
});

await navigate("/admin"); // if not logged in, redirects to /login; route().path becomes "/login"
```

### Behavioral scenarios
- `before` returns `false` → `route().path` unchanged, handler does not run, no `pushState`/`replaceState` (history.length unchanged)
- `before` returns a string → `route().path` becomes the redirect target, redirect-target handler runs, original handler does not
- `before` returns `void` / `undefined` / `true` / truthy non-string → navigation proceeds (backward compat)
- `before` returns `Promise<false>` → handler waits for resolution then cancels
- `before` returns `Promise<string>` → handler waits then redirects
- `before` returns `Promise<void>` → handler waits then proceeds
- nested chain: parent `before` returns `false` → child `before` does not run and handler does not run (short-circuit)
- nested chain: parent `before` returns void + child `before` returns `false` → parent proceeds, child cancels, handler does not run
- nested chain: parent `before` returns a redirect string → child `before` does not run, redirect occurs
- global `hooks.before` returns `false` → navigation canceled before any per-route hook runs
- global `hooks.before` returns a string → redirect wins over any per-route hook
- `before` throws → navigation canceled, error logged via `console.error("[router] guard:", ...)`
- `before` throws async (rejected Promise) → same as a sync throw after await
- handler error after a guard passes → handler error does not roll back navigation (non-blocking semantics preserved)
- `after` hook error → does not affect navigation (post-handler, non-blocking)
- navigation timing: `navigate("/x")` followed by an immediate `route().path` read is stale (not `/x`); after `await tick(0)` it equals `/x`

### Doc placement
- `packages/router/docs/concepts/routing.mdx` — Concept — Route Guards section (`:202-231`) — rewrite for the return contract + idiomatic auth guard; keep the note that `after` stays non-blocking
- `packages/router/docs/api/router.mdx` — Function template (existing) — "Hook Returns" (`:272-274`) — replace with the guard contract (`before` can block via return value; `after` stays non-blocking)
- `packages/router/docs/patterns/routing.mdx` — Pattern — Auth Guard (`:52-75`) — simplify to the return-based guard (no handler double-check)
- `packages/router/AGENTS.md` — instructions — Non-Obvious Behaviors + Hook Execution order (scoped edit), then `bun sync` to regenerate mirrors

### Tests view
New `tests/guards.test.ts`, one `test()` per scenario in Behavioral scenarios (16). Update `tests/hooks.test.ts:124-145` (async hooks now block the handler — await before asserting) and `tests/errors.test.ts:23-64` (throwing `before` now cancels navigation). `mock()` for handler counts, `await tick(0)` for microtask flushes, no boolean-flag counters (tests.md §Mock Patterns).

### Docs view
Rewrite Route Guards in `docs/concepts/routing.mdx`, Hook Returns in `docs/api/router.mdx`, and the Auth Guard in `docs/patterns/routing.mdx`; edit the scoped bullets in `packages/router/AGENTS.md` — per Doc placement. No standalone new-export page is created (no new symbol re-exported by `index.ts` — only `navigate`'s return type widens; per `docs.md` §Template Selection an in-place edit of existing pages applies).

---

## [ ] Implement guard pipeline refactor (Code)
**Type:** Code
**Depends on:** None

### Strategy
Reorder `tryMatchRoute` (`lib/utils.ts:177-256`) so the `before` chain runs before the signal update at `:210-217`/`:242-248` — a rejection must never produce an observable route change. Collect the chain (global `hooks().before` first, then each `nestedMatches[i].routeValue.before` parent-to-leaf, or the flat routeValue's `before`) and execute sequentially via a new `runGuards(hookChain, params, query)` helper in `lib/hooks.ts` that awaits Promises and short-circuits on the first `false`/`string`. On `false`, `tryMatchRoute` returns handled; on `string`, call `go(string, { replace: true })` and return; otherwise proceed with the existing signal update + `executeRouteWithHooks`. The post-guard `executeRouteWithHooks` (`internal/matched.ts:127-165`) drops its `before` steps — only `handler` + `after` run. Pipeline-wide async propagation: `tryMatchRoute`, `updateRoute`, `go` become async; `navigate` returns `Promise<void>`; the popstate/hashchange handler is async; the `queueMicrotask` wrapper stays. URL-on-rejection decision: option (b) — restructure `go()` so `pushState` (`:79`) happens after `updateRoute` confirms guards passed (`updateRoute` returns boolean). Error handling: a throwing/rejected guard cancels (catch, log `console.error("[router] guard:", error)`, return `false`); post-guard handler/`after` errors keep current non-blocking semantics. No new hook name, no new type — only the return contract becomes meaningful. Trade-off considered and rejected: option (a) accept-URL-change-but-skip-signal — leaves the address bar disagreeing with `route().path`; option (b) is cleaner.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `navigate` returns `Promise<void>`; `before` return contract enforced in `runGuards`
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`); the `before` return contract documented in JSDoc on `GlobalHooks.before` / `RouteWithHooks.before`
- [ ] No new runtime dependency
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on the changed `lib/**` files reports no deviations from `./guides/code.md`

## [ ] Test guard behavior (Tests)
**Type:** Tests
**Depends on:** Implement guard pipeline refactor

### Strategy
New `tests/guards.test.ts`, one `test()` per Behavioral scenario (16): return-value matrix (`false`/string/void/`true`/truthy non-string + the three Promise variants), nested short-circuit cases, global-vs-per-route precedence, sync and async throws, post-guard handler/`after` non-blocking preservation, and the always-async timing assertion (`navigate` then stale read, then `await tick(0)` then resolved read). Update `tests/hooks.test.ts:124-145` (async hooks now block the handler — `await tick(0)` before asserting) and `tests/errors.test.ts:23-64` (a throwing `before` now cancels; the error is still logged `[router] guard:`; `after`/handler errors keep non-blocking semantics). `mock()` for handler counts, `await tick(0)` for microtask flushes, no boolean-flag/integer counters (tests.md §Mock Patterns). Cross-check each assertion against `runGuards` and the reordered `tryMatchRoute`.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on `lib/hooks.ts` `runGuards` + the `lib/utils.ts` `tryMatchRoute` guard branch (name the files + line ranges in the commit message)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (16 in the new file)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against `runGuards` and `tryMatchRoute`

## [ ] Document guard semantics (Docs)
**Type:** Docs
**Depends on:** Implement guard pipeline refactor

### Strategy
Three doc updates currently state non-blocking as a design principle. Rewrite the Route Guards section in `docs/concepts/routing.mdx:202-231` to document the return contract (`false` cancels, string redirects, Promise awaits) with the idiomatic auth-guard pattern; the "double-check in handler" workaround becomes unnecessary. Replace the "Hook Returns" paragraph in `docs/api/router.mdx:272-274` with the guard contract (`before` can block via return value; `after` stays non-blocking). Simplify the Auth Guard pattern in `docs/patterns/routing.mdx:52-75` to the return-based guard. Edit `packages/router/AGENTS.md` Non-Obvious Behaviors ("Hooks never block navigation" → before-hooks-can-block semantics) and Hook Execution order (guard phase runs before the signal update) — a scoped edit specific to this flip, then run `bun sync` to regenerate the `CLAUDE.md` mirror + `.github/instructions/*`. The router-comparison §8 differentiator #6 ("Non-blocking hook execution") is regenerated by the comparison skill — out of scope here.

### Definition of Done
- [ ] Every code example in the changed files compiles against the current source signatures (including `await navigate(...)`)
- [ ] The correct template from `./guides/docs.md` is preserved on each page (Function on `api/router.mdx`, Concept on `concepts/routing.mdx`, Pattern on `patterns/routing.mdx`)
- [ ] Package docs (`packages/router/docs/**/*.mdx`) have no frontmatter
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta (`navigate: Promise<void>`; `before` return contract) appears verbatim in `api/router.mdx`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against `runGuards`, `tryMatchRoute`, and the guard tests
- [ ] `packages/router/AGENTS.md` no longer claims hooks never block navigation
