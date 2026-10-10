---
type: fact
title: "HappyDOM suppresses dispatched click propagation on disabled form controls"
description: "In dom tests, never combine a `disabled` render assertion with a click-dispatch handler assertion on the same element; assert the disabled attribute separately or drop it from the spread."
tags: [happydom, events, testing]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [click-dispatch-test, disabled-attribute, delegated-events, event-propagation, mount-test]
---
# Why

`btn.dispatchEvent(new MouseEvent("click", { bubbles: true }))` on a `disabled` button never reaches
`document.body`'s delegated capture listener: the event's propagation stops at the target, so the
handler is silently never invoked while the wiring (element state `handlers`, body listener
registration) is completely correct. The failure reads as a broken `routePrefixedProps`/delegation
bug and costs a long debug loop (state inspection shows `handlers: ["click"]` present, dispatch
yields nothing). A real browser propagates programmatic `dispatchEvent` on disabled controls;
HappyDOM does not, so the same test passes in-browser and fails under `bun test`.

# Evidence

Scratch probe during plan unit `plans/ui/code/attrs-spread/01-engine-html-spread` (2026-10-07): a
body-capture counter saw the dispatched click 0 times with `disabled: true` in the spread and 1 time
after removing it; handler state (`peekState(btn).handlers`) was `["click"]` in both cases, and
`on:click` on the vnode (no disabled) fired normally in the identical container setup. Suites:
`packages/dom/tests/template.test.ts` spread tests dispatch clicks on non-disabled buttons only.
