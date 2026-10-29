---
title: Registry compose regions accept only plain class arrays; compute conditional classes before the block
description: "The @hella:compose region rejects any expression containing brackets other than a literal class array — assign conditional class values to a variable outside the region or use a plain class attribute."
tags: [ui, registry, build, applyStyleVariant, compose, styles]
confirmed: 2026-10-29
---
# Why

`applyStyleVariant` (the registry build's style splicer) parses each `class={/* @hella:compose ... */}` region and requires the region body to be a plain class-array literal. A composed region whose body is a bare identifier or a conditional expression fails the bundle with `[ui] applyStyleVariant: compose region must be a plain class array (no "[" found)`. Conditional class selection therefore computes before the JSX (`const rootClass = multiple ? [chips, cls] : [base, cls];`) and either passes a plain array in the compose region or drops the markers for a plain `class={...}` attribute, which the splicer leaves untouched (precedent: the registry's passthrough `class={cls}` parts).

# Evidence

`scripts/bundle/registry.ts` compiles each canonical through `applyStyleVariant` (`packages/ui/lib/internal/transform.ts`); the error string is thrown for non-array compose bodies. Reproduced by bundling a registry entry whose composed class carried a ternary; the plain-attribute and precomputed-variable forms pass `vp run bundle ui`.
