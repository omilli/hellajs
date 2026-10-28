---
title: Patch happy-dom TransitionEvent propertyName with defineProperty for fire-path asserts
description: "happy-dom's TransitionEvent constructor accepts { propertyName } but the instance property reads undefined — dispatches with it never satisfy a propertyName filter, so a test asserting the fire-path patches the instance via Object.defineProperty; unpatched dispatches only prove inertness."
tags: [happy-dom, TransitionEvent, transitionend, testing, event, propertyName]
confirmed: 2026-10-28
---
# Why

`new TransitionEvent("transitionend", { propertyName: "transform" })` produces an event whose `propertyName` is `undefined` in happy-dom, while real browsers set it. Any handler filtering on `event.propertyName === "transform"` (drawer-style exit-notify) therefore never fires under test — and suites built before that filter can pass anyway when a fallback timer (e.g. a copied animation-duration budget) unmounts the target, masking that the filtered path is untested. When a test must exercise the fire-path, patch the instance: `Object.defineProperty(event, "propertyName", { value: "transform" })` after constructing with matching init — same accommodation shape as the documented `setPointerCapture` gap. Plain unpatched dispatches remain useful for the inert branches (wrong property, bubbled child target).

# Evidence

Scratch probe under `packages/headless/tests/` (deleted after): a handler reading `(event as TransitionEvent).propertyName` on such a dispatch recorded `prop=undefined` while `type` and `target` were correct. `packages/ui/tests/drawer.test.tsx` "completes the exit through the panel's transitionend" dispatches the plain constructor and passes only because the drawer root's 350ms fallback unmounts the panel — the propertyName filter path is not what the assertion observes.
