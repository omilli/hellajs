---
title: Do not narrow forwarded attribute-map props in headless part-prop types
description: Headless part-props interfaces must inherit HTMLAttributes fields like disabled/name/value instead of re-declaring them narrower, or the ui pastes that forward raw attr-map values fail the registry build's staged tsc.
tags: [headless, ui, parts, types, HTMLAttributes, HellaPrimitive, registry, tsc, factories]
confirmed: 2026-10-29
---
# Why

A headless parts factory's part-prop interface extends `HTMLAttributes<"button">` etc., whose fields are wide (`disabled?: HellaPrimitive<boolean>`, `name?: HellaPrimitive`, `value?: HellaPrimitive` in `packages/dom/lib/types/attributes.d.ts`). The ui registry pastes destructure those same fields from their own attr-map-typed props and forward them RAW into the factory parts. Re-declaring a field narrower inside the factory's props interface (`disabled?: boolean`, `name?: string`) compiles inside the headless package but fails `vp run coverage headless` at the ui registry's declaration-emit step: `TS2322 Type 'HellaPrimitive<boolean> | undefined' is not assignable to type 'boolean | undefined'` — the bundle gate rebuilds ui dist/registry even on a headless-scoped run, so the failure surfaces far from the edit. Drop the narrowing re-declaration and let the field inherit; normalize inside the part body (`disabled ? true : undefined`, the template form).

Second seam in the same area: `HTMLAttributeMap["div"]` has no `name` field, so a paste destructuring `name` off a div-typed props bag gets `unknown` (an index-signature read, not TS2339). The canonical pattern is a cast at the paste, exactly as the radio-group template wrote it: `name={name as string | undefined}`; the factory option stays `name?: string`.

# Evidence

2026-10-29 press-family rebuild: `packages/headless/lib/types/parts.d.ts` initially declared `disabled?: boolean` on the five button-ish part-props and `name?: string` on `RadioGroupItemProps`; `vp run bundle ui` failed with 16 TS2322s across the staged `.src` copies of the five rebuilt pastes. Removing the four narrowing re-declarations (keeping `value?: string`, whose paste-side source is already `string`) and casting `name` at the radio-group paste took the bundle to exit 0; `vp run coverage headless` and `vp run coverage ui` green (246 + 1866 tests).
