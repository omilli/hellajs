---
type: decision
title: "Delegated `on:` handlers fire from a body capture listener, so event.currentTarget is NOT the target element — extract event data from e.target; direct `e:` handlers are the only form where currentTarget is the element"
description: "Delegated `on:` handlers run from a body capture listener, so e.currentTarget is not the target element — extract event data from e.target; only direct `e:` handlers may use currentTarget."
tags: [arch, dom, registry, events]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [delegated-handler-currenttarget, e-target-extraction, body-capture-listener, on-prefix-delegation, registry-component-handlers]
---
# Why

Registry canonicals (and any component) that read typed values inside `on:` handlers must use `(e.target as HTMLInputElement).value`. dom registers ONE capture listener per event type on `document.body` (`setNodeHandler`) and walks `event.composedPath()`; at handler time the event's `currentTarget` is the body (capture context), while `handler.call(element, event)` binds only `this` — so `e.currentTarget.value` is `undefined`, and with `props.oninput?.(...)` the optional chain swallows it into a silently wrong argument. The direct path (`e:` → `setDirectHandler`) attaches to the element itself, so `currentTarget` IS the element there — the same expression passes in the html flavor and fails in the jsx flavor, which makes the bug flavor-dependent and easy to misdiagnose. `e.target` is the event origin and correct in both paths.

# Evidence

- `packages/dom/lib/internal/events.ts` `delegatedHandler`: capture listener `document.body.addEventListener(type, delegatedHandler, true)` + `composedPath()` walk, handler invoked `handler.call(element, event)`.
- Red: input.test.ts `passes the typed value to oninput` failed for both jsx variants with `expected "typed", received undefined` while both html (`e:`) variants passed.
- Green: canonicals switched to `e.target` → `bun bundle ui --quiet` + full ui suite 104 pass / 0 fail.
