---
type: decision
title: Per-entry item accessors compare by value identity, never reference identity
description: "Gate per-entry item state by entry.value, never the captured reference: keyBy value-reuse keeps reused nodes and their mount-time closures alive across array replacements."
tags: [contract, ui, reactivity]
timestamp: 2026-10-14
last_confirmed: 2026-10-14
triggers: [items-prop, keyBy, ForEach-reuse, filter-accessor]
---
# Why

Under `keyBy="value"`, ForEach reuses a reordered entry's DOM node, so the node's per-entry
accessors keep the entry reference captured at first render. If an accessor compares that
reference against the live array (`matches().includes(entry)`), a caller update that rebuilds
entry objects (`items(items().map((e) => ({ ...e })))`) strands the reused node: the comparison
goes false and the row misjudges its state. Comparing by `entry.value` survives any update
shape because values are the selection identity by contract. Combobox's `hidden` filter still
holds the reference-compare form deliberately: plan contract
(`plans/ui/code/reactive-items-family/02-overlay-pickers.md`) froze the hidden-trick ("keep
combobox's hidden-trick untouched - the id switch is the only behavioral change beyond the
widened prop"), and the docs document the identity-stable update pattern. If a future change
touches that accessor, switch it to a value comparison in the same pass.

# Evidence

`packages/ui/registry/combobox/combobox.tsx` ComboboxList (`hidden={() => !matches().includes(entry)}`)
and its mirror `combobox-html.ts` (read 2026-10-14, unit 02); reuse semantics from
`packages/dom/lib/ForEach.ts` `resolveItemKey` (explicit key -> reuse, node persists, closures
unre-rendered); reuse-under-reorder proven by `reuses the selected item's node through a reorder
when keyBy is value` (node identity assert) passing in `packages/ui/tests/combobox.test.ts`
under `bun coverage ui` (3352 pass).
