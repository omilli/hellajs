---
title: Sweep units keeping vocabulary exports must replace the parts loop with a composed slot scenario
description: "When a registry sweep deletes *PartVariants for a component that KEEPS vocabulary exports (popover Header/Title/Description, dialog Header/Footer/Title, menu items), the deleted parts loop was those exports' only test coverage - replace it with one composed content-slot scenario driven through a MenuModuleTable + menuModulePart, never leave kept exports untested."
tags: [ui, registry, sweep, tests, variants-helper, vocabulary, coverage]
confirmed: 2026-10-31
---
# Why

The blanket sweep delta "delete *PartVariants + parts constants + part variant props types" reads as delete-all even where the unit's own Scope keeps vocabulary exports. Executing it literally orphans those exports: the `renders every named part with its data-slot` loop is their ONLY coverage repo-wide - headless tests assert almost none of the registry wrappers' data-slots (headless popover tests touch only `popover-content`). Zero-coverage kept exports then merge as silent debt, identically across every later unit that repeats the phrasing.

The replacement stays inside the sweep's grain - no standalone part machinery survives: keep a style-keyed module table (`export const popoverModules: MenuModuleTable = { css, tailwind }`) in `packages/ui/tests/helpers/variants.tsx` beside the variants, and in the `.ts` suite build the panel by CALLING the compiled vocabulary functions (the dropdown-menu pattern - compiled components are plain callables, no JSX needed in `.ts`): `menuModulePart<{ children?: HellaChildren }>(popoverModules, variant, "PopoverHeader")`, composed into the root's `content` prop, then assert the data-slots and tag names through the portaled panel.

# Evidence

`rg -n 'Header|Title|Description' packages/headless/tests/popover.test.ts` - zero matches (2026-10-31); the ui parts loop was the sole asserter. Operator-approved amendment executed in `packages/ui/tests/popover.test.ts` ("renders the header/title/description vocabulary inside the content slot") + `popoverModules` in `packages/ui/tests/helpers/variants.tsx`; `vp run coverage ui` exits 0 at 69 files / 1885 tests.
