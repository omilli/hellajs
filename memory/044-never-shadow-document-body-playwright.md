---
title: Never shadow document.body in Playwright addInitScript spies
description: A Playwright addInitScript that defineProperty-traps document.body poisons every page script — the parser sets body through internal slots, so the trap's getter keeps returning null and produces fake "Cannot read properties of null" errors pointing at innocent page code.
tags: [playwright, probe, addInitScript, document-body, false-positive, browser-debugging]
confirmed: 2026-02-09
---

# Why

When instrumenting a page before its scripts run, trapping `document.body` per-instance (init-time `let _body = document.body` + `Object.defineProperty(document, "body", { get, set })`) breaks the whole page: at init-script time body is null, and the HTML parser assigns the real body through internal slots — never through the JS setter — so the getter returns null forever. Every page script reading `document.body` (e.g. `@hellajs/dom`'s `setNodeHandler` registering its delegated capture listener: `document.body.addEventListener(...)`) then throws `TypeError: Cannot read properties of null (reading 'addEventListener')` with a stack pointing at the library, not the spy. In a hydrate-wiring investigation this manufactured an exact false root-cause lead — the same page with NO spy ran clean. Spy at the prototype instead: patch `EventTarget.prototype.addEventListener` (survives parser-created objects, shadows nothing), and for per-instance needs patch only objects you did not create after they exist.

# Evidence

2026-02-09, docs dev server (`astro dev`, `docs/`): probe A (defineProperty trap on document.body) → `[astro-island] Error hydrating … TypeError: Cannot read properties of null (reading 'addEventListener') at setNodeHandler (packages/dom/dist/internal/events.js)`; probe B (no spy, same page) → zero page errors; probe C (`EventTarget.prototype.addEventListener` patch recording capture registrations) → correct data (`body:click:cap` registered, handler fired) with no errors. The real defect under investigation was unrelated (hydrate bare-adopt arms never wiring regions), found only after discarding probe A's error.
