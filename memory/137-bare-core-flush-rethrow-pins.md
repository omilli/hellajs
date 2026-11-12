---
title: Bare-core flush rethrow pins need an explicit setFlushErrorHandler(null)
description: "@hellajs/dom's errors feature installs itself as core's scheduled-drain error handler at module init, so any test that transitively loads @hellajs/dom flips scheduled-drain throws from rethrow to dispatch — rethrow pins must call setFlushErrorHandler(null) first."
tags: [core, dom, flush, scheduler, errors, testing, test-helpers]
confirmed: 2026-11-12
---
# Why

`@hellajs/dom`'s errors feature (`packages/dom/lib/features/errors.ts`) calls core's `setFlushErrorHandler` at module init, routing scheduled-drain throws into `dispatchError` (`phase: "flush"`). The shared test helper module `utils/test-helpers.js` imports `@hellajs/dom` (for `resetDom`), so ANY test file importing it — including core-package tests that never touch DOM — lands with dom's routing installed: a scheduled-drain throw dispatches (console fallback when no `onError` handlers exist) instead of rethrowing, and a pin asserting `toThrow` on the captured microtask silently fails. Core-side tests pinning the bare-core rethrow path must call `setFlushErrorHandler(null)` before the drain; dom-side determinism is safe because `resetErrorState` re-installs the routing, so every `resetDom()` (via `resetTestState` in dom tests) restores it after core tests unregister.

# Evidence

`packages/dom/lib/features/errors.ts` (`installFlushErrorRouting`, `resetErrorState`) and `packages/core/lib/internal/scheduler.ts` (`scheduleFlush` catch rethrowing only when no handler is registered). Reproduced 2026-11-12: `packages/core/tests/flush.test.ts` failed `vp run coverage core` on the captured-microtask `toThrow` pin until the test added `setFlushErrorHandler(null)`; the same test file passes with the explicit unregister (19 files, 167 tests green).
