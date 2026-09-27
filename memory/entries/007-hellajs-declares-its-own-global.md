---
type: decision
title: "HellaJS declares its own global JSX namespace in the dom barrel (packages/dom/lib/index.ts) — Element = HellaNode & RenderFn, not React"
description: "The global JSX namespace is HellaJS's own, declared in the dom barrel (declare global block) — JSX.Element = HellaNode & RenderFn; the tsconfig jsx setting is preserve, not a React pointer."
tags: [arch, types, dom, jsx, contract]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [jsx-namespace, jsx-element-type, component-typing, render-fn-type]
---
# Why

The global JSX namespace is HellaJS's own, not React's. Every app-facing tsconfig (root, base, lint,
examples) sets `jsx: preserve` — no JSX runtime is ever injected, so this global namespace is the sole
governing declaration; only the plugin tsconfigs (build tooling) keep `react-jsx`. The real declaration
is a `declare global` block in the dom *barrel*, not a types file. Two non-obvious, load-bearing consequences:

1. **`JSX.Element = HellaNode & RenderFn`** — an *intersection*, so a render-fn is typed AS a HellaNode.
   This is why component functions returning `JSX.Element` are assignable where `ComponentReturn`
   (`HellaNode | (() => HellaNode)`) is expected: the `HellaNode` arm of the intersection satisfies it.
   Reasoning about component return types, `component()`'s signature, or ssr's `RenderFn` handling all
   bottom out on this intersection.
2. **The namespace lives in the dom barrel specifically**; no other package redeclares it. Editing
   `JSX.Element`/`IntrinsicElements` is a one-file change in `packages/dom/lib/index.ts`, and importing
   `@hellajs/dom` is what makes the global visible (including to type-check of compiled component files).

# Evidence

- `packages/dom/lib/index.ts:34-47` (read 2026-09-26): `declare global { namespace JSX { type Element = HellaNode & RenderFn; interface IntrinsicElements extends HTMLAttributeMap { } interface ElementAttributesProperty { props: {}; } interface ElementChildrenAttribute { children: {}; } } }`.
- This session (2026-09-26): repo-wide `rg 'namespace JSX'` over packages/, plugins/, examples/ matches
  only the barrel — no types file or other package redeclares it; root/base/lint/example tsconfigs use
  `jsx: preserve` (only plugin tsconfigs keep `react-jsx`). `component.ts:14` still types
  `component<P>(fn: (props: P) => ComponentReturn, props: P)`.
- Load-bearing example this session: widening `component()` to
  `component<P>(fn: (props: P) => ComponentReturn, props: P)` relied on `JSX.Element`
  (`HellaNode & RenderFn`) being assignable to `ComponentReturn`; without knowing the intersection shape,
  the assignability is opaque.
