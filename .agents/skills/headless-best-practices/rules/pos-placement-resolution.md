---
title: Read placements as flip-then-clamp with direction-aware start and end
impact: MEDIUM
impactDescription: assuming the flip changes axis, or that vertical-side start and end ignore direction, places overlays on the wrong edge for RTL users
tags: computeAnchorPosition, placement, rtl
---

## Read placements as flip-then-clamp with direction-aware start and end

Placement strings are a side plus optional alignment: `"bottom-start"`, `"left-end"`, plain `"bottom"` reads as center. When the floating box does not fit the viewport on the requested side, the placement flips to the opposite side on the SAME axis - vertical stays vertical, horizontal stays horizontal - and both axes then shift-clamp inside the viewport. `offset` (default 0) is the gap on the placement side. Direction resolves only the horizontal axis: `top`/`bottom` placements resolve `-start`/`-end` through `dir` (start trails left in ltr, right in rtl), while `left`/`right` placements align vertically and are direction-free. `anchorPosition` reads `dir` from the anchor's computed `direction` once at setup; `computeAnchorPosition` defaults to ltr and takes `dir` in its options.

**Incorrect (what is wrong):**

```ts
import { computeAnchorPosition } from "@hellajs/headless/utils";

// dir omitted: an RTL anchor's bottom-start menu aligns its start edge to
// the wrong side - the vertical axis is the one direction resolves.
const place = (anchorRect: DOMRect, dropdown: HTMLElement) =>
  computeAnchorPosition(
    anchorRect,
    { width: dropdown.offsetWidth, height: dropdown.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    { placement: "bottom-start", offset: 4 },
  );
```

**Correct (what is right):**

```ts
import { computeAnchorPosition } from "@hellajs/headless/utils";

// dir resolves -start/-end on the horizontal axis; the engine flips
// bottom to top only when the floating box will not fit below the anchor.
const place = (anchorRect: DOMRect, dropdown: HTMLElement, dir: "ltr" | "rtl") =>
  computeAnchorPosition(
    anchorRect,
    { width: dropdown.offsetWidth, height: dropdown.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    { placement: "bottom-start", offset: 4, dir },
  );
```

Reference: `packages/headless/lib/utils/computeAnchorPosition.ts` and `packages/headless/tests/computeanchorposition.test.ts`
