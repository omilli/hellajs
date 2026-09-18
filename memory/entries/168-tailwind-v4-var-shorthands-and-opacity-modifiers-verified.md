---
type: decision
title: "Tailwind v4 verified on var-shorthand arbitrary values incl. opacity modifiers — bg-(--primary)/90 compiles to color-mix with fallback; registry tailwind variants keep modifiers"
description: tailwindcss 4.1.18 probe: v4 var shorthands (bg-(--primary)) generate; the /90 opacity modifier lowers to a color-mix chain behind @supports. Keep modifiers in registry tailwind class strings.
tags: [arch, ui, css, tailwind]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [tailwind-v4-verify, opacity-modifier, var-shorthand, arbitrary-value, tokens-sheet]
---
# Why

The ui set's shared scope flagged "verify v4 opacity-modifier support on vars at unit time" as a bounded open: the tailwind registry variants read the SAME custom properties as the css variants via v4 shorthands, and shadcn-familiar hovers want `hover:bg-(--primary)/90`. Unverified, the safe move was dropping modifiers and hardcoding hover colors; the probe settled it — keep the modifiers, one token sheet, one dark-mode story.

What breaks if ignored: nothing in HellaJS runtime code — this only governs the class strings registry tailwind variants emit (Button now; Input/Card/Dialog/Tabs inherit). If a future tailwind upgrade regresses var-shorthand opacity lowering, the failure mode is a hover color falling back to the plain var (visible, not silent corruption).

# Evidence

- Probe (this session): `compile()` JS API of `/home/milli/dev/hellajs/docs/node_modules/tailwindcss` (4.1.18) with `@source inline(...)` over the 22 candidate utilities used by Button — all FOUND, `color-mix` present; emitted rule for `bg-(--primary)/90`: `background-color: var(--primary)` plus `@supports (color: color-mix(in lab, red, red)) { background-color: color-mix(in oklab, var(--primary) 90%, transparent) }`.
- Consumed by `packages/ui/registry/button/tailwind/button.tsx` + `button-html.ts`; bounded open marked RESOLVED in `plans/ui/code/hellajs-ui/03-ui-registry-button.md`.
