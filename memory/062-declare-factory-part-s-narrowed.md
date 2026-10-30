---
title: Declare the factory part's narrowed prop name on the ui paste when the public prop differs
description: "A ui paste whose public prop name differs from a headless part's narrowed prop must redeclare and destructure that prop name itself, or the attr-map rest spread fails the registry build's staged tsc."
tags: [headless, ui, parts, types, HTMLAttributes, HellaPrimitive, rest-spread, registry, tsc, factories, tabs]
confirmed: 2026-10-30
---
# Why

When a headless part-prop interface narrows an attr-map field (`value?: string` against `HTMLAttributes<"button">`'s `value?: HellaPrimitive`), a paste component that forwards its rest spread onto that part collides with the narrowing whenever the paste's own public prop carries a DIFFERENT name: the rest keeps the base map's wide `value?: HellaPrimitive`, and the JSX spread fails the declaration-emit gate with `TS2322 Type 'HellaPrimitive | undefined' is not assignable to type 'string | undefined'` — reported at the explicit prop's position, not at the spread, so the error site misleads. Declaring `value?: string` on the paste's props interface and destructuring it removes the field from the rest; forward the paste's own key with a bridge (`value={value ?? id}`) so existing consumers keep working. The isolated shape typechecks clean; only the rest-spread form fails — reproduce against the real spliced bytes before concluding anything from a minimal probe.

# Evidence

2026-10-30 tabs rebuild: `packages/ui/registry/tabs/tabs.tsx` `TabsTrigger` destructured `id` and spread `...attrs` onto the headless `Trigger` (`value?: string`); `vp run bundle ui` failed with TS2322 at the spliced `.src/tabs/{css,tailwind}/tabs.tsx`. An isolated probe (`id?: string` narrowed, explicit `value={id}`) passed; adding `{...attrs}` reproduced it. Declaring `value?: string` in `tabs-types.ts` `TabsTriggerProps`/`TabsContentProps`, destructuring it, and forwarding `value ?? id` took the bundle to exit 0 with `vp run coverage ui` green (69 files, 1866 tests).
