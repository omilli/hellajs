---
title: Compiler auto-wraps reactive expressions at element position only, never at component position
description: "maybeReactive wraps call-containing attribute values and children at ELEMENT position (both `{fn()}` and `{fn}` are reactive there), but isComponent positions skip the wrap: props and children pass through as-is, so `label={count()}` freezes at its build-time value."
tags: [compiler, dom, reactivity, maybeReactive, jsx, props, attributes]
confirmed: 2026-11-05
---
# Why

Predicting reactivity from JSX shape alone misanswers the most common docs/tests question: "does `{count()}` update?" At element position yes (the compiler wraps it), at component position no (nothing wraps it). Rules or examples claiming `class={theme()}` freezes in compiled JSX are wrong; the real silent freeze is component props and children. Hand-authored `@hellajs/dom/runtime` `prop`/`child` calls behave like the component arm: a plain value applies once, a function value is effect-wrapped.

# Evidence

`plugins/compiler/src/processors/attributes.mjs` line 95: `if (!isComponent) value = maybeReactive(value);` and `plugins/compiler/src/processors/children.mjs` line 49: `result.push(isComponent ? expression : maybeReactive(expression));` — `maybeReactive` (`plugins/compiler/src/utils/reactive.mjs`) wraps any expression whose subtree contains a call unless the top level is already a function (or a top-level `raw()` call, the value sentinel). Verified by live compile through `plugins/compiler/index.mjs` `transform` 2026-11-05: `<p>{count()}</p>` emits `_hellaChild(root, () => count())`, `<p title={count()}>` emits `_hellaProp(root, "title", () => count())`, while `<Card>{count()}</Card>` emits `children: [count()]` and `<Card label={count()}>` emits `label: count()` — resolved, unwrapped. `guides/docs.md` §Example Code Style already encodes the element arm ("attribute values written directly ... auto-wraps call-containing expressions").
