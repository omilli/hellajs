---
type: fact
title: ForEach explicit key prop is consumed for reconciliation but still renders as a DOM attribute — parts must destructure-and-drop it
description: >
  ForEach reads element.props.key for node reuse, but neither babel nor dom's renderProp filters
  it — a component spreading ...attrs renders key="…" into the DOM; destructure and drop key in
  the ForEach-rooted part.
tags: [dom, foreach, registry]
timestamp: 2026-10-14
last_confirmed: 2026-10-14
triggers: [foreach-keyed-list, key-attribute-leak, registry-dynamic-items]
---

# Why

`ForEach`'s key resolution chain is explicit `key` prop → `item.id` property → array index
(`packages/dom/lib/ForEach.ts` `resolveItemKey`). The explicit-key arm only *reads* the prop for
the tracking maps — nothing downstream removes it: babel's attribute processor passes `key`
into props verbatim (`plugins/babel/src/processors/attributes.mjs`), and dom's
`renderProp` has no `key` special-case (`packages/dom/lib/internal/utils.ts` `renderProp`), so
`setAttribute("key", value)` runs. A registry-style part that spreads `{...attrs}` therefore
ships `key="…"` into the DOM. Type-wise the prop is silently admissible via
`GlobalHTMLAttributes`' `[key: string]: unknown` (`packages/dom/lib/types/attributes.d.ts`), so
tsc never flags it.

Also verified same session: keys never affect order — DOM order always equals the `each` array
order (ForEach's LIS pass only minimizes node moves); and an entry type with an `id` field
auto-keys (`hasExplicitKey: true` — reuse-by-id even on reference change), so index-default
keying is impossible for id-carrying entries (tabs' `TabsItem.id`).

# Evidence

Empirical probe against `dist/registry/accordion/css/accordion` (2026-10-14): `ForEach` over a
signal with `AccordionItem({ key: entry.value, ... })` rendered
`<div data-slot="accordion-item" ... key="z">` — confirmed in `outerHTML`; the same probe
showed value-keyed reuse preserving `data-state="open"` through a prepend, and reorder tests
showing DOM order exactly following the array. Source: `renderProp` (no key branch),
`resolveItemKey` (id/index fallback), attributes.mjs (no key filter).
