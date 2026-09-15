---
type: decision
title: "HappyDOM window.location.pathname is 'blank' (about:blank) and history.replaceState({}, '', '/') does NOT change it — router() init resolves 'blank', firing notFound for unmatched routes"
description: HappyDOM quirk — pathname is the literal 'blank'; replaceState cannot move it. setupRouterEnv now seeds a real URL, so router() init matches whenever '/' is configured — isolate init firings.
tags: [testing, router, happydom, env]
timestamp: 2026-09-15
last_confirmed: 2026-09-15
triggers: [happydom-location, router-test-init, blank-pathname, notfound-call-count]
---
# Why

When `router()` init became synchronous (the router-ssr set), three existing tests broke asserting `notFound` was called exactly once after `navigate()` — it was now called twice. Root cause traced via an instrumented repro: under HappyDOM `window.location.pathname` is the literal string `"blank"` (the about:blank default), and `setupRouterEnv`'s `window.history.replaceState({}, "", "/")` does not update it. So `router()`'s initial resolution targets `"blank"`, matches no route, and fires `notFound` synchronously during `router()`. Previously the init firing was deferred to a microtask AFTER the synchronous assertion, so the tests saw count 1; with synchronous init both firings precede the assertion.

This is a test-env quirk, not production behavior (a real browser's pathname is the actual URL). UPDATE 2026-09-10 (router tests audit, unit 02): `setupRouterEnv` now seeds a real URL (`window.location.href = pageUrl`, default `"http://localhost/"`) instead of the no-op `replaceState` — the quirk no longer poisons the default env. Consequence: `router()` init matches whenever the config has a `/` route, so init firings are MORE common — any router test asserting handler/notFound/effect/log counts immediately after `router()` must isolate the init firing (`mockClear()` after `router()`, or clear a log array); assert state (`route().path`/`handler`) instead of counts otherwise. The HappyDOM fact itself stands: a raw `replaceState({}, '', '/')` on about:blank still cannot move pathname off `"blank"`. To pin the attempted init path in a test, pass `url: "/"` in the router config (the SSR-init path sets `initialPath` explicitly, bypassing `window.location`). Unrelated to memory 015's HappyDOM fact (innerHTML-inserted scripts are not executed by HappyDOM).

# Evidence

- Instrumented repro (2026-07-14): `console.log(window.location.pathname)` printed `"blank"` after `resetTestState(); setupContainer(); window.history.replaceState({}, "", "/")`; the `router()` init then fired `notFound` for the unmatched `"blank"` path before any `navigate()`.
- `packages/router/tests/redirects.test.ts` and `routing.test.ts`: 3 tests fixed with `notFound.mockClear()` after `router()` once init went synchronous.
- `utils/happydom.js`: `GlobalRegistrator.register()` — the source of the about:blank default pathname.
- 2026-09-10 refresh: `packages/router/tests/helpers.ts` `setupRouterEnv(pageUrl = "http://localhost/")` assigns `window.location.href`; probe run (261 pass, 2 init-doubling failures in `reset-router.test.ts`/`hooks.test.ts`) fixed by `handler.mockClear()` / `log.length = 0` isolation; `bun coverage router` exit 0, 263 pass, 100% lines.
