---
type: decision
title: Typed event listeners on generic Node/ParentNode targets fail TS2345 — only document/window have keyed event maps; type the closure (event: Event) and narrow once
description: Generic Node/ParentNode addEventListener exposes only the string→EventListener overload, rejecting (e: KeyboardEvent) => void (TS2345); use (event: Event) + one top-of-closure cast.
tags: [typescript, dom, events, packages]
timestamp: 2026-09-11
last_confirmed: 2026-09-11
triggers: [ts2345-eventlistener, typed-keydown-listener, addeventlistener-overload, node-target-listener, keyboard-event-cast]
---

# Why

`document.addEventListener("keydown", (e: KeyboardEvent) => void)` compiles because `Document`'s method group includes the keyed `DocumentEventMap` overload; `Node`/`ParentNode`/`Element`-as-`ParentNode` expose only `(type: string, listener: EventListener)`, and `EventListener`'s call signature is a function type (strict contravariance), so a closure demanding `KeyboardEvent` is rejected — TS2345/TS2769 on both add and remove. Building primitives (2026-09-11) cost one failed `bun bundle` round-trip to learn this; dom's own `internal/events.ts setDirectHandler` already used the correct shape (wrapper `(event: Event)`, listener invoked via `.call`).

Fix pattern for listeners attached to caller-supplied generic targets: type the closure `(event: Event): void`, narrow once at the top (`const key = (event as KeyboardEvent).key;`), keep the body concrete. Listeners attached to `document`/`window` keep concrete event params (keyed maps accept them). Do not cast the listener at the call site (`as EventListener`) — the param-cast matches the repo precedent and keeps the body honest.

# Evidence

- Red: `bun bundle primitives` → `onEscape.ts(23,38): error TS2345: Argument of type '(event: KeyboardEvent) => void' is not assignable to parameter of type 'EventListener'` (+ same for rovingTabIndex container listener), while `trapFocus`/`onOutside` on `document` passed untouched.
- Green: `packages/primitives/lib/onEscape.ts` (`onKeyDown = (event: Event): void => { if ((event as KeyboardEvent).key === "Escape") handler(); }`) and `lib/rovingTabIndex.ts` (`const key = (event as KeyboardEvent).key;`) — `bun bundle primitives` + `bun coverage primitives` exit 0.
- Precedent: `packages/dom/lib/internal/events.ts` `setDirectHandler` — `element.addEventListener(type, wrappedHandler, options)` with `wrappedHandler = (event: Event) => { ... }`.
