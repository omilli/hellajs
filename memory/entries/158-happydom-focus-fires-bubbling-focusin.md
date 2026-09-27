---
type: decision
title: HappyDOM focus() fires bubbling focusin, enabling automatic-activation tests
description: HappyDOM focus() dispatches a bubbling focusin synchronously, so container-level focusin listeners see arrow-key focus moves: the pattern for testing WAI-ARIA automatic activation.
tags: [testing, happy-dom]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [keyboard-navigation-test, roving-tabindex, automatic-activation]
---
# Why

Automatic-activation components select on focus, not keydown: the primitive (rovingTabIndex) owns keydown and moves focus; the component listens for focusin and selects whatever landed. Testing that chain requires focus() to fire focusin with bubbles — if it didn't, container-level listeners would never fire and every such test would need a second keydown listener or manual event dispatch. Confirmed true in this repo's happy-dom, so keyboard-nav tests can rely on: focus the tab, press the arrow on it, assert activeElement + selection in one synchronous step.

# Evidence

happy-dom 20.14.5 (resolved via @happy-dom/global-registrator; bun hoists to `node_modules/.bun/happy-dom@20.14.5/`) — lib/nodes/html-element/HTMLElementUtility.js `focus()` dispatches `new FocusEvent('focus', { bubbles: false, composed: true })` then `new FocusEvent('focusin', { bubbles: true, composed: true })`. Load-bearing in packages/ui/tests/tabs.test.ts "moves focus and selection together across arrows, wraps, and jumps to the ends" (passes over all four compiled variants — re-confirmed 2026-09-27: `bun bundle ui --quiet && bun test packages/ui/tests/tabs.test.ts`, 34 pass).
