---
title: "Prefix every css() comma-group part with &; never nest & keys under a comma parent"
description: "In @hellajs/css maps, a bare comma group key (\".a, .b\") leaks every part after the first out of scope, and a nested & key under a comma-group parent is literal substitution - the comma never distributes, so the nested state applies unconditionally to all but the last part; write \"& .a, & .b\" for shared declarations and keep &-state keys (&:hover, &.is-x) inside the per-element rules."
tags: [css, css-in-js, nested-selectors, scoping, hover]
confirmed: 2026-01-30
---

# Why

Two silent mis-compilations in component `css()` maps (docs site chrome, any `packages/css` consumer). Compilation rules (`packages/css/lib/css.ts` `process()`): a key starting with `&` has every `&` replaced by the parent selector string; a bare key gets `parent + " " + key`; both are literal string operations.

1. Bare comma group `".code-copy, .code-toggle"` compiles to `.view-code .code-copy,.code-toggle` - only the first part carries the parent scope; every later part becomes a global selector leaking out of the component's namespace.
2. A nested `&:hover` under a comma-group parent compiles to `.view-code .code-copy,.view-code .code-toggle:hover` - the substitution inserts the whole comma string at one `&`, so the comma never distributes and every part but the last gets the nested state unconditionally (the copy button was permanently cyan, hover-only on the toggle).
3. A bare `":hover"` key (no `&`) compiles as a descendant selector (`.code-toggle :hover`), matching hovered children, never the element - seen as "label invisible until hovered" (the rule painted the hovered label span, not the button).

Correct shapes: shared declarations across classes as `"& .a, & .b": {...}` (every part carries `&`); state keys (`&:hover`, `&.is-open`, `& svg`) nested inside the single-class per-element rule; parent-level states as their own `"&.is-open": { ".child": {...} }` blocks (the InstallSection `.install-tab` + `&.is-active` idiom).

# Evidence

Built docs site HTML (`astro build`, `docs/src/components/CodeExample.astro`) emitted `.view-code .code-copy,.code-toggle{...}` for a bare group key and `.view-code .code-copy,.view-code .code-toggle:hover{color:var(--primary)}` for the `&:hover`-under-group form; after moving hover into the per-element rules with the `& .a, & .b` shared group, emission is `.view-code .code-copy,.view-code .code-toggle{...}` plus `.view-code .code-copy:hover{...}` / `.view-code .code-toggle:hover{...}` (verified 2026-01-30 with a headless-Chrome probe: hover on the button edge recolors the button itself, `rgb(56, 235, 255)`, and idle color returns to `oklch(0.97807 0.029 256.847)`).
