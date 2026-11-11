---
title: Treat ForEach explicit-key row content as frozen snapshots
description: ForEach rows keyed by node key/item id reuse their live node regardless of item reference, so use-callback reads of plain item properties resolve once and never update on toggle/replace writes.
tags: [dom, ForEach, keyed reconciliation, row content, snapshot, e2e]
confirmed: 2026-11-10
---
# Why

A spec (or a tutorial claim) asserting that an explicit-keyed ForEach row's
class/style/prop recomputes after the item object is replaced will fail no
matter how the list is driven — the row's DOM node is retained by key identity
and its content was resolved against the initial item snapshot. Visible state
that must track per-item changes needs either non-explicit keys (index or
reference-identity re-resolve), per-item reactive state (e.g. a keyed signal
map), or assertions scoped to list composition (counts, filters, stats) rather
than row internals.

# Evidence

`packages/dom/lib/ForEach.ts` (read 2026-11-10): the per-item key resolution
marks extractor/node-`key`/`item.id` keys explicit, and the re-resolve branch
skips when `explicit && keyToNode.has(key)` — retained keys reuse the live node
"regardless of item reference". Documented contract:
`.agents/skills/dom-best-practices/rules/list-stable-unique-keys.md`
("Explicit-class keys ... reuse a live node by key identity regardless of item
reference"). Empirical: a browser e2e click on a todo checkbox replaced the
array item (immutable map) and the row `<span>` kept its initial hash class
only — `getComputedStyle(span).text-decoration-line` stayed `none` across 14
retries — while list-level stats, filters, and title (signal-driven outside
rows) all updated.
