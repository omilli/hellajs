---
type: decision
title: resetResource clears onlineCallbacks but never resets onlineStatus — online/offline leaks across tests
description: "resource's onlineStatus is module state that survives resetTestState()/resetResource(); tests touching online behavior must dispatch their own state per test and restore online in afterEach."
tags: [testing, resource]
timestamp: 2026-08-21
last_confirmed: 2026-08-21
triggers: [resource-online-test, onlinestatus, resetteststate, pausewhenoffline]
---

# Why

`onlineStatus` (cache.ts) is a module-level `let` initialized once from `navigator.onLine` at load and mutated only by the global `online`/`offline` window listeners. The reset path (`resetTestState` → `resetResource` → `resetCacheState`) clears `cacheMap`, `onlineCallbacks`, and `lastCleanupTime` — but **not** `onlineStatus`. So the browser-simulated online/offline state persists across tests and across files within a `bun coverage` run. A test that dispatches `offline` and fails (or forgets to restore) leaves every later resource test running "offline": resources without `pauseWhenOffline` are unaffected (they never consult it — verified by the current-behavior pin in offline-pausing.test.ts), but any resource with `pauseWhenOffline: true` or an `onOnlineChange` subscriber expecting default-online inherits the stale state and flakes.

# Evidence

- `packages/resource/lib/cache.ts` — `let onlineStatus = hasNavigator() ? navigator.onLine : true;` at module scope; `resetCacheState()` clears `onlineCallbacks` only (no `onlineStatus` write); `resourceCache.isOnline()` reads the live variable.
- `packages/resource/lib/resetResource.ts` — `resetResource()` calls only `resetCacheState()` + `resetDedupe()`.
- `utils/test-helpers.js` — `resetTestState()` calls `resetResource()`; nothing dispatches `online`.
- `packages/resource/tests/offline-pausing.test.ts` — the working pattern: every test opens by dispatching the state it needs (`new Event("offline")` or `"online"`), and an `afterEach(() => window.dispatchEvent(new Event("online")))` guarantees the world is online for later files.
