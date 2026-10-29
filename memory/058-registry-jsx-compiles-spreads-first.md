---
title: "Registry JSX compiles spreads first and explicit handlers last, so internal on: handlers override spread handlers"
description: "The babel transform emits explicit props, then {...spread} attributes, then explicit on: handlers — and dom's single-slot handler map keeps the last registration — so a factory part's internal on:click wins over a user's spread on:click, while spread attrs override earlier explicit props."
tags: [dom, jsx, babel-plugin, events, registry, props]
confirmed: 2026-10-29
---
# Why

Two compile/ordering facts decide whether a wrapper or a factory owns an event:

1. `plugins/babel`'s emitted property order is: explicit non-handler props via `_hellaProp`, then `Object.keys(attrs).forEach(_hellaProp)` for spreads, then explicit `on:*` handlers via `_hellaOn` last.
2. `dom`'s `on()` writes `state.handlers[type] = handler` — one slot per event type — so the last registration for a type wins, and `_hellaProp` routes `on:*` keys into the same `on()`.

Consequences: an explicit `on:click` in a factory part beats a user `on:click` arriving through `{...attrs}` (the select trigger's override semantics); chaining user handlers requires destructuring them from props and calling them inside the internal handler (the popover/menu factory pattern), because the spread slot is overwritten otherwise. Conversely, explicit non-handler props lose to spread attrs (attrs spread later), which is how user `placeholder`/`id`/`aria-*` forwarding onto inner elements works.

# Evidence

`packages/dom/dist/internal/events.js` `setNodeHandler` (single-slot map) and `packages/dom/dist/runtime.js` `prop` (the `on:` prefix routing); compiled emission order visible in `packages/ui/dist/registry/select/css/select.js` `SelectTrigger` (spread `Object.keys(attrs)` before the `_hellaOn` registrations).
