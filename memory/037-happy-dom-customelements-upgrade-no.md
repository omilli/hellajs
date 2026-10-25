---
title: "happy-dom: customElements.upgrade is a no-op — template clones upgrade manually at create time"
description: In happy-dom, customElements.upgrade does nothing ("Not implemented yet"), so dom template create fns re-create defined custom elements as upgraded instances themselves; clones of a parse that preceded define are otherwise permanently un-upgraded and wiring misses the property branch.
tags: [happy-dom, custom-elements, dom, runtime, templates, upgrade, testing]
confirmed: 2026-10-24
---

# Why

The babel plugin hoists `template(...)` calls to module evaluation, so a template's parse can
precede the component's `customElements.define`. A clone of that parse is a plain HTMLElement:
`renderProp`'s custom-element gate (`key in element`) misses and stringifies the value as an
attribute, and the later insert-time platform upgrade re-runs constructor field initializers,
clobbering anything wired. The platform escape hatch is dead in tests: happy-dom's
`CustomElementRegistry.upgrade` is literally `// Not implemented yet` (empty body). The fix
(`packages/dom/lib/features/custom-elements.ts` `upgradedShell`/`upgradeClones`, armed per
builder by the feature's parse-time hyphen scan, registered into the runtime create path via
`setCloneUpgrader`): at create-fn time, re-create each defined custom element via
`document.createElement` (which upgrades synchronously), move attributes and children across,
and walk descendants — wiring then always sees the real accessors and insertion never
re-upgrades.

# Evidence

Source read 2026-10-23: `node_modules/happy-dom/lib/custom-element/CustomElementRegistry.js`
(`upgrade(_root) { // Do nothing }`), the upgrade machinery (then `packages/dom/lib/runtime.ts`,
since moved to `lib/features/custom-elements.ts`), `renderProp`'s custom-element branch
(`packages/dom/lib/internal/utils.ts`). Verified by `packages/dom/tests/custom-element-props.test.tsx`
(4 tests red before, green after) within `vp run coverage dom` exit 0.

# Test-design corollary (probed 2026-10-24)

Two happy-dom behaviors make naive upgrade assertions lie, both confirmed by a scratch probe
(`document.createElement("template")` + `innerHTML`, then constructor-name + instanceof checks):

- `cloneNode` NEVER upgrades (pre-define parse's clone stays plain `HTMLElement`), but happy-dom's
  HTML parser DOES upgrade a POST-define parse inside `<template>` content (spec says template
  content never upgrades — happy-dom does it anyway), and INSERTION into the document upgrades a
  defined-but-plain element (platform behavior, spec-correct).
- Consequence: a `mount(...)` + `toBeInstanceOf` test passes through the platform's insert-time
  upgrade with the create-path feature absent (vacuous), and a builder created AFTER `define`
  passes through the parser's upgrade (also vacuous). Assert the create fn in isolation,
  pre-insert, with builder creation BEFORE `define` — see `packages/dom/tests/features.test.ts`'
  feature-gating tests (`template(...)` → define → `build()` → instanceof).
