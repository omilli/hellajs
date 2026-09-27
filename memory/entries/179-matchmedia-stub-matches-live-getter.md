---
type: fact
title: "A matchMedia stub must expose `matches` as a live getter — components read `query.matches` in the change handler, so a snapshot taken at creation never reflects flips"
description: "Components read query.matches inside the change handler, not the event object; a `{ matches: snapshot }` stub freezes at creation. Build stubs with `get matches() { return state; }`."
tags: [ui, tests, matchMedia, stub, happydom]
timestamp: 2026-09-23
last_confirmed: 2026-09-27
triggers: [matchmedia-stub, mobile-detection, media-flip-test, query-matches-frozen, stub-getter]
---
# Why

Tests stubbing `window.matchMedia` for mobile-detection components naturally write `{ matches: <current>, addEventListener, removeEventListener }`. The sidebar provider's handler is `() => { viewport(query.matches); }` — it reads the MediaQueryList OBJECT's `matches`, not the dispatched event's. With the snapshot shape, flipping the stub variable and firing listeners leaves the component reading the frozen creation-time value: the media test's panel never mounts and `state.mobile()` stays false.

# Evidence

Session 2026-09-23, sidebar unit: probe showed `wired: true, listeners: 1` yet `mobile()` false after firing `{ matches: true }` — the handler re-read `query.matches` (false). Changing the stub to `get matches() { return mediaMatches; }` (packages/ui/tests/sidebar.test.ts `installMediaStub`) made all four flavors' media-flip suites pass.
