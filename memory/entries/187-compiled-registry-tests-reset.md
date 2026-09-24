---
type: correction
title: Compiled-registry component tests must resetDom() from the bare "@hellajs/dom" import — resetTestState only resets the /bundle instance
description: resetTestState resets only the /bundle instance; compiled registry components run on the bare "@hellajs/dom" instance, so beforeEach needs the bare resetDom() too or shared clocks prime across tests.
tags: [testing, dom, ui-registry]
timestamp: 2026-09-19
last_confirmed: 2026-09-19
triggers: [registry-component-test, hover-intent-test, layer-dismissal-test, cross-test-state-priming]
---
# Why

`@hellajs/dom` resolves to `dist/index.js` (per-module build) and `@hellajs/dom/bundle` to `dist/bundle.js` (flattened) — separate module instances with duplicated module-level state (`packages/dom/package.json` exports; the ui AGENTS.md documents the split for MOUNTING but not for RESETS). `resetTestState()` (`utils/test-helpers.js`) calls the bundle instance's `resetDom()`, so a component's bare-instance `lastOpenedAt` (hoverIntent's shared 500ms skip window) or `layerStack` survives `beforeEach`. Symptom: a test asserting "not open yet" right after the first `pointerenter` fails whenever an earlier test opened a tooltip/hover-card < 500ms earlier — the primitive is behaving as designed (the skip window is global by contract) and the fix is isolation, not the component.

# Evidence

Verified 2026-09-19 in the ui-shadcn-components unit 9 run: `tooltip.test.ts` "opens after the open delay" failed on the html-format variants only when a jsx-variant sibling ran first (a probe showed the content appearing synchronously at `pointerenter` — instant skip-window open); adding `resetDom()` from `"@hellajs/dom"` next to `resetTestState()` in `beforeEach` drove all 138 anchored-overlay tests green (`bun coverage ui` exit 0). Any behavior-wired registry unit (menus, select, combobox — every consumer of `hoverIntent`/`layerDismissal`) needs the same dual reset.
