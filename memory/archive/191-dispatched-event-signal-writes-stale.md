---
type: decision
title: In registry component tests, dismissal-triggered onClose runs the wiring but signal writes from inside dispatched events never propagate — drive exits test-scope
description: Dismissal tests over compiled registry components assert the wiring (mock onClose); dispatch handlers fire but signal writes inside them never flush attribute bindings - drive exits test-scope.
tags: [testing, ui, signals, events]
timestamp: 2026-09-22
last_confirmed: 2026-09-22
triggers: [dismissal-test, event-dispatch-signal, esc-close-test, drag-dismiss-test, exit-animation-test, modal-test-pattern]
---
# Why

A test that dispatches ESC on a portal-mounted dialog panel, then asserts `data-state="closed"`, fails forever: the keydown listener fires and calls `onClose`, but the caller's signal write (and any write made inside the dismissal handler itself) does not flush the attribute bindings scheduled from that event dispatch. Waiting does not help — the binding is still `"open"` after a 50ms timeout. The delivered `dialog.test.ts` is shaped around this: dismissal tests assert `onClose` mock calls only, and the exit/animation tests flip `open` test-scope (`dlg.open(false)`) before asserting `data-state`, the exit transform, and unmount.

# Evidence

Probed same-session (drawer unit 14): ESC dispatch on the delivered dialog AND the new drawer → `onClose` called once, `data-state` stays `"open"` after a microtask hop AND after 50ms; a direct test-scope `open(false)` flips `data-state` to `"closed"` immediately. Unit 14's drawer tests initially asserted `data-state="closed"` after dispatched drag-release/ESC — 12 failures, all fixed by the mock-assert + test-scope-exit shape.
