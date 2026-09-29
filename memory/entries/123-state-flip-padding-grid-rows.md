---
type: decision
title: State-flip padding on grid-rows collapse items; static padding floors the 0fr row
description: A 0fr grid-template-rows track cannot shrink past the grid item's own padding box (min-height: 0 does not lift that floor), so collapse ports must transition padding 0-to-open on data-state.
tags: [ui, css]
timestamp: 2026-09-29
last_confirmed: 2026-09-29
triggers: [grid-rows-collapse-port, accordion-collapsible-styles, closed-content-dead-space]
---
# Why

The registry's grid-rows collapse technique (shadcn keyframe port) puts `overflow: hidden` + `min-height: 0` on the collapsing grid item. A static `padding-bottom` on that same item keeps its border box at the padding height even when the row is 0fr, so every closed panel reserves dead space (invisible under the closed `opacity: 0` but pushing layout, unlike shadcn where Radix animates the outer element's height to a literal 0). Moving `overflow: hidden` to the outer wrapper does not help: clipping hides paint but the row still sizes to the padding floor. The fix that works: mirror `data-state` onto the inner item and transition its padding (0 closed, the ref's value open) over the same 200ms window — the combined height then follows one easing curve exactly (linear combination of same-window transitions).

# Evidence

Chrome 141 via Playwright (`channel: "chrome"`), measured on the compiled registry output in `packages/ui/tests/.tmp/padding-repro/`: stock closed content = 16px tall; outer `overflow: hidden` variant = 16px (disproven); state-flipped `padding-bottom` = 0px closed, 36px + 16px padding open. Applied in `packages/ui/registry/accordion/accordion-css.ts` + `accordion-tailwind.ts` (`contentInner`) with `data-state` mirrored in `accordion.tsx` + `accordion-html.ts`; `bun coverage ui` green, new parity test verified red pre-fix. `packages/ui/registry/collapsible/` carries no inner padding, so it never had the floor.
