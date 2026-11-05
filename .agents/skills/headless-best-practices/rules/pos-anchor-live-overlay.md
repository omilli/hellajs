---
title: Use anchorPosition for live fixed overlays
impact: HIGH
impactDescription: a once-at-open getBoundingClientRect strands the overlay the moment the page scrolls, and hand-rolled scroll listeners miss nested scrollers
tags: anchorPosition, positioning, overlay
---

## Use anchorPosition for live fixed overlays

`anchorPosition(anchor, floating, options?)` applies `position: fixed`, places the floating element, and keeps it placed: window `scroll` (capture, so nested scrollers reposition too) and `resize` re-run the math, and the dispose handle removes both listeners. It measures the anchor rect live per reposition and the floating box through `offsetWidth`/`offsetHeight` so CSS transforms never skew the math; `matchAnchorWidth: true` pins the width and takes the element out of flow BEFORE measuring, so the first positioning pass sees the final box; `onUpdate(placement)` reports each resolved placement after flipping. `computeAnchorPosition` is the pure rect-math seam - zero DOM, the testable core - for engines that own their own listener lifecycle (the factories' anchored layer). Computing once at open and walking away is the bug: every scroll strand the overlay.

**Incorrect (what is wrong):**

```ts
import { computeAnchorPosition } from "@hellajs/headless/utils";

// Computed once: the dropdown is misplaced on the first scroll. This is the
// pure seam, not the live wiring.
const place = (trigger: HTMLElement, dropdown: HTMLElement) => {
  const { x, y } = computeAnchorPosition(
    trigger.getBoundingClientRect(),
    { width: dropdown.offsetWidth, height: dropdown.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
  );
  dropdown.style.position = "fixed";
  dropdown.style.left = `${x}px`;
  dropdown.style.top = `${y}px`;
};
```

**Correct (what is right):**

```ts
import { anchorPosition } from "@hellajs/headless/utils";

// Fixed placement plus window scroll (capture) and resize tracking,
// disposed when the surface closes.
const place = (trigger: HTMLElement, dropdown: HTMLElement) =>
  anchorPosition(trigger, dropdown, {
    placement: "bottom-start",
    matchAnchorWidth: true,
    onUpdate: (placement) => dropdown.setAttribute("data-side", placement),
  });
```

Reference: `packages/headless/lib/utils/anchorPosition.ts` and `packages/headless/docs/api/anchorposition.mdx`
