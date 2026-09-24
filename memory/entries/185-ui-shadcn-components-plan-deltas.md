---
type: decision
title: "In ui-shadcn-components plan deltas, the pinned refs govern when delta prose conflicts"
description: Plan unit deltas may enumerate variants or props that differ from refs/shadcn/*.tsx; the refs are the verbatim source of truth and the operator confirmed refs win, with deviations noted.
tags: [contract, ui, registry, planning]
timestamp: 2026-09-19
last_confirmed: 2026-09-19
triggers: [plan-delta-conflict, shadcn-refs, variant-enumeration, registry-unit]
---
# Why
Unit 04's delta prose invented variant sets the pinned refs do not carry: marker
("position variants top-start/top-end/bottom-start/bottom-end/center", "variant map
default/secondary/outline") vs the actual `refs/shadcn/marker.tsx` (`default/separator/border`,
no positions), and item ("cover/highlight variants", "default/highlight/inset/outline") vs the
actual `refs/shadcn/item.tsx` (`default/outline/muted` + `size default/sm`, `ItemMedia
default/icon/image`). The set index and the unit's own citations declare the refs "the only
styling truth", so the delta enumeration was stale, not the refs. The operator ruled (this
session): refs govern; implement ref-verbatim and note the deviation in tick notes and concept
pages. Later units in this set (05-22) hit the same hazard: never synthesize class strings to
satisfy delta prose, and count words ("nine parts") are unreliable too — unit 04's "nine parts"
headings enumerate ten exports each.

# Evidence
- `plans/ui/code/ui-shadcn-components/refs/shadcn/marker.tsx` + `item.tsx` read this session
  (2026-09-19): variant sets as stated above; `refs/manifest.md` pins c257f688 and calls class
  strings and DOM structure verbatim source of truth.
- Operator answer to the audit-code fork question: "Refs govern (Recommended)".
- Unit 04 ticks note the two deviations; marker/item concept pages document the shipped variant
  maps.
