---
title: Rename entry types that share a deleted part's name
description: "When a registry sweep deletes a standalone part whose identifier is also the items-entry type, rename the entry type to `<Name>Entry` instead of leaving the part's name on a data shape."
tags: [ui, registry, parts, sweep, naming, entry-types, breaking]
confirmed: "2026-10-31"
---
# Why

A sweep DoD's part-name rg pattern includes the bare part name and must exit 1 over `packages/ui`. When the component's entry type bears that same name (radio-group shipped both a `RadioGroupItem` part component and a `RadioGroupItem` entry interface in one compiled module), keeping the type under the part's name makes the sweep unsatisfiable over source and leaves a data shape named like a deleted component. Renaming to `<Name>Entry` satisfies the sweep and aligns with the sibling convention (`SelectEntry`, `ToggleGroupEntry`, `AccordionEntry`, `ComboboxEntry`); it is a breaking surface delta inside an already-BREAKING sweep commit, so it adds no release cost.

# Evidence

`packages/ui/registry/radio-group/radio-group-types.ts` (2026-10-31): the interface `RadioGroupItem` renamed to `RadioGroupEntry` and `RadioGroupProps.items` retyped in the same pass that deleted the `RadioGroupItem` part component; `rg -n 'RadioGroupItem' packages/ui` exits 1 afterward, and `vp run coverage ui` passes 69 files / 1850 tests. The tests helper had already anticipated the convention: `packages/ui/tests/helpers/variants.tsx` names the mirror bag `RadioGroupEntryVariant`.
