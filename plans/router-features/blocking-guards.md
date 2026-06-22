## [ ] Reuse before hook return value as blocking guard signal

### Depends On
None

### Objective
The existing `before` hook (global, per-route, and nested) gains guard semantics — returning `false` cancels navigation (no signal update, no `pushState`), returning a string replace-redirects, returning a `Promise` is awaited before the handler runs — walking back the "non-blocking by design" differentiator named in `router-comparison.md` Section 6 as HellaJS's biggest functional gap.

### Sub-tasks

#### [ ] Guard pipeline refactor (Code)
**Solution:**
No new hook name, no new type. The existing `before` field on `RouteWithHooks` (`packages/router/lib/types.d.ts:59-72`) and `GlobalHooks.before` (`packages/router/lib/types.d.ts:95-100`) stays as-is — only its return value becomes meaningful.

Return contract for every `before` hook:

- Returns `void` / `undefined` / truthy non-string / `true` → proceed. Backward compatible with virtually all existing `before` hooks (which return void or the result of a fire-and-forget side effect).
- Returns `false` → cancel navigation. No `route()` signal update. No `pushState`. No handler execution. Scroll does not run.
- Returns `string` → redirect via `go(returnedString, { replace: true })`. Navigation to the original target is abandoned.
- Returns `Promise<false | string | void>` → the whole navigation pipeline awaits the Promise. Once resolved, apply the same rules to the resolved value.

Pipeline reorder in `packages/router/lib/utils.ts`. Today `tryMatchRoute` (lines 177-256) updates the `route()` signal at lines 210-216 (nested) and 242-248 (flat) **before** `executeRouteWithHooks` runs at lines 217 and 249. Guard support requires running `before` hooks **before** the signal update so a rejection never produces an observable route change.

New flow inside `tryMatchRoute`:

- Collect the chain of `before` hooks for the matched route: global `hooks().before` first, then each `nestedMatches[i].routeValue.before` parent-to-leaf (or the flat routeValue's `before`).
- Execute them sequentially via a new `runGuards(hookChain, params, query)` helper in `packages/router/lib/hooks.ts`. The helper awaits Promises and short-circuits on the first `false` or `string` return.
- If a guard returns `false`: return `true` from `tryMatchRoute` (navigation considered handled — nothing else runs). The URL is whatever `go()` already pushed (see timing note below).
- If a guard returns `string`: call `go(string, { replace: true })` and return `true`. The redirect chain restarts resolution.
- If all guards pass: proceed with the existing signal update + `executeRouteWithHooks` flow. The non-blocking `before` execution inside `executeRouteWithHooks` (`packages/router/lib/internal/matched.ts:138-165`) must stop re-running `before` hooks — they ran in the guard phase. Only `handler` and `after` hooks run post-guard. `executeGlobalHook(after, ...)` still runs last.

Pipeline-wide async propagation. Because `runGuards` awaits Promises and any `before` may be async, `tryMatchRoute` becomes `async`. Its callers propagate: `updateRoute` in `lib/utils.ts:94-124` becomes `async`; `go` in `lib/utils.ts:66-86` becomes `async`; `navigate` in `lib/navigate.ts:10-37` returns `Promise<void>` instead of `void`; the `popstate` / `hashchange` handler in `lib/router.ts:48-59` becomes `async` (fine — platform-invoked). The `queueMicrotask(() => updateRoute())` at `lib/router.ts:66` stays (the microtask still fires; it just awaits internally).

Timing shift — always async. Per the confirmed scope, every navigation now updates `route()` on a microtask boundary, not synchronously. `navigate()` returns before the route is resolved. Existing synchronous test patterns (e.g. `navigate("/"); expect(container.textContent).toBe("home")` in `packages/router/tests/routing.test.ts:25-29`) break and require `flush()` or `await tick(0)` between `navigate` and the assertion.

URL state on rejection. `go()` already calls `window.history.pushState` at `lib/utils.ts:79` before calling `updateRoute()`. If a guard rejects, the URL has already been pushed. Two options: (a) accept the URL change but skip the signal update (the address bar shows the rejected path but `route().path` does not) — messy; (b) move the `pushState` call after the guard check. Option (b) is cleaner — restructure `go()` so `pushState` happens after `updateRoute` confirms guards passed. This requires `updateRoute` to signal success/failure back to `go()` (return `boolean`). Flag this as a key decision point in implementation; option (b) is recommended.

Error handling. The current `executeHook` in `packages/router/lib/hooks.ts:13-41` wraps in `try/catch` and logs via `console.error`. For the guard phase, a thrown error should not silently proceed (current behavior) — a throwing guard should fail the navigation (treat as `false`). Update `runGuards` to catch, log via `console.error("[router] guard:", error)`, and return `false`. The post-guard phase (handler + after) keeps the current non-blocking error semantics — handler errors do not cancel anything.

Files touched:

- `packages/router/lib/types.d.ts` — update JSDoc on `GlobalHooks.before` and `RouteWithHooks.before` to document the new return contract. No new types.
- `packages/router/lib/hooks.ts` — new `runGuards` helper (the existing `executeHook` stays for the post-guard handler/after phase).
- `packages/router/lib/utils.ts` — reorder `tryMatchRoute` to run guards before signal update; make `tryMatchRoute`, `updateRoute`, `go` async; `go` returns success boolean so `pushState` can be gated.
- `packages/router/lib/navigate.ts` — return type becomes `Promise<void>`; await `go`.
- `packages/router/lib/router.ts` — `popstate`/`hashchange` handler async; `queueMicrotask` wrapper stays.
- `packages/router/lib/internal/matched.ts` — `executeRouteWithHooks` drops the `before` execution steps (lines 134-136, 138-147, 158-160); only `handler` and `after` run post-guard.

Cited evidence: `comparison` Section 6 ("This is HellaJS's biggest functional gap"); `comparison` Section 8 Features Matrix rows "Global hooks" and "Per-route guards" (every competitor blocks); `comparison` Bottom Line ("no real guards — before hooks can't block navigation, a deliberate but limiting choice"); `comparison` Section 8 differentiator #6 ("Non-blocking hook execution" — the differentiator being walked back); `file` `packages/router/lib/hooks.ts:13-41` (executeHook returns hookResult but callers ignore it); `file` `packages/router/lib/internal/matched.ts:127-165` (executeRouteWithHooks discards before return); `file` `packages/router/lib/utils.ts:210-217` (signal update before hooks — the reorder point); `file` `packages/router/docs/concepts/routing.mdx:202-231` (documents non-blocking as a design choice); `file` `packages/router/docs/api/router.mdx:272-274` (same); `file` `packages/router/AGENTS.md` (same).

**Breaking change — changeset required.** Three breaking dimensions: (1) any existing `before` that happens to `return false` or `return "/path"` becomes a guard signal (silent breakage in rare cases); (2) navigation timing becomes always-async — code reading `route()` synchronously after `navigate()` sees stale state; (3) the documented "non-blocking" guarantee no longer holds. The changeset goes at `.changeset/router-blocking-guards.md` and is a semver-major.

**Guide conflict flagged.** `packages/router/AGENTS.md` Non-Obvious Behaviors section explicitly states "Hooks never block navigation". This plan contradicts that statement. The AGENTS.md must be updated as part of this task to document the new guard semantics. The comparison doc Section 8 differentiator #6 also needs revisiting post-merge (out of scope for this plan — the comparison doc is regenerated by the comparison skill).

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] Guard behavior tests (Tests)
**Solution:**
Update existing tests and add new ones.

Update `packages/router/tests/hooks.test.ts`:

- The async-hooks tests at lines 124-145 (`"handles async hooks without blocking"` and `"supports mixed sync and async hooks"`) currently assert the handler runs before the async hook resolves. Under the new pipeline these assertions break — the handler now waits for async `before` to resolve. Rewrite to `await tick(0)` before asserting handler ran.
- The arity-edge-case tests at lines 214-281 pass through fine (return void → proceed).

Update `packages/router/tests/errors.test.ts`:

- The error-handling tests at lines 23-64 currently assert that a throwing `before` does not block the handler. Under the new pipeline, a throwing guard fails the navigation. These tests need to change: a throwing `before` now cancels navigation (handler does not run). The error is still logged via `console.error("[router] guard:", error)`. After-hook and handler errors keep their current non-blocking semantics.

New file `packages/router/tests/guards.test.ts`. Cases:

- `before` returns `false` — `route().path` stays at the previous value, handler never runs (verified via `mock()`), no `pushState` call (or `replaceState` — verify `window.history.length` unchanged).
- `before` returns a string — `route().path` becomes the redirect target, redirect-target handler runs, original handler does not.
- `before` returns `void` / `undefined` / `true` / truthy non-string — navigation proceeds (backward compat).
- `before` returns `Promise<false>` — handler waits for resolution, then cancels. Use `await tick(0)` then assert handler did not run.
- `before` returns `Promise<string>` — handler waits, then redirects.
- `before` returns `Promise<void>` — handler waits, then proceeds.
- Nested guard chain: parent `before` returns `false`, child `before` does not run (short-circuit), handler does not run.
- Nested guard chain: parent `before` returns void, child `before` returns `false` — parent proceeded, child canceled, handler does not run.
- Nested guard chain: parent returns redirect string — child `before` does not run, redirect occurs.
- Global `hooks.before` returns `false` — entire navigation canceled before any per-route hook runs.
- Global `hooks.before` returns string — redirect wins over any per-route hook.
- `before` throws — navigation canceled, error logged via `console.error("[router] guard:", ...)`.
- `before` throws async (rejected Promise) — same as sync throw after await.
- Handler error after guard passes — handler error does not roll back navigation (current non-blocking semantics for handler errors preserved).
- `after` hook error — does not affect navigation (post-handler, non-blocking).
- Navigation timing: `navigate("/x"); expect(route().path).not.toBe("/x")` (stale), then `await tick(0); expect(route().path).toBe("/x")`.

Mock pattern per `guides/tests.md` — `mock()` for handler call counts, `await tick(0)` for microtask flushes, no boolean-flag counters.

Cited evidence: `test` missing — no `tests/guards*.test.ts` exists; `comparison` Section 6 confirms the gap.

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`packages/router/lib/hooks.ts` runGuards + `packages/router/lib/utils.ts` tryMatchRoute guard branch — name the file and line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Guard semantics docs (Docs)
**Solution:**
Three doc updates required — all currently state non-blocking as a design principle.

Update `packages/router/docs/concepts/routing.mdx:202-231` — the "Route Guards" section. Rewrite to document the new return-value contract: `before` returning `false` cancels, returning a string redirects, returning a Promise awaits. The existing "double-check in handler" workaround pattern becomes unnecessary when guards are used. Show the new idiomatic auth-guard pattern using return values. Keep the note that `after` hooks remain non-blocking.

Update `packages/router/docs/api/router.mdx:251-274` — the "Arity-Based Dispatch Behavior" and "Hook Returns" Important Considerations. Replace the "Hook Returns" paragraph (lines 272-274) with the new guard contract: `before` can block via return value, `after` stays non-blocking.

Update `packages/router/AGENTS.md` Non-Obvious Behaviors — replace the "Hooks never block navigation" bullet with the new semantics: "before hooks can block navigation by returning false or a redirect string; after hooks stay non-blocking". Update the Hook Execution section to reflect the guard phase running before signal update.

Update `packages/router/docs/patterns/routing.mdx:52-75` — the Auth Guard pattern. Simplify to use the new return-based guard (no double-check needed in handler).

Cited evidence: `file` `packages/router/docs/concepts/routing.mdx:202-231` (current non-blocking documentation); `file` `packages/router/docs/api/router.mdx:272-274` (same); `file` `packages/router/AGENTS.md` (same); `file` `packages/router/docs/patterns/routing.mdx:52-75` (current workaround pattern).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
