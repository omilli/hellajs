---
title: Consumers own drag value math and touch-action
impact: HIGH
impactDescription: without touch-action none the browser scrolls instead of dragging - pointercancel fires mid-gesture and the delta stream dies
tags: onDrag, gesture, touch-action
---

## Consumers own drag value math and touch-action

`onDrag(el, handlers)` reports CUMULATIVE deltas - `{ dx, dy, event }` measured from the drag start - on primary-button pointerdown (presses on `[disabled]` descendants are skipped), takes guarded pointer capture, and fires `onEnd` once on pointerup, pointercancel, or lostpointercapture. The util owns only the tracking: clamping, translation, and any value derivation are the consumer's math over the cumulative deltas - never stack deltas per move. `touch-action: none` is the consumer's responsibility too: without it a touch drag scrolls the page and the browser cancels the pointer stream. Keep the wiring for the element's lifetime and dispose it on teardown, or use the factories that compose `onDrag` internally (slider, scrollArea, toast).

**Incorrect (what is wrong):**

```tsx
import { onDrag } from "@hellajs/headless/utils";

// No touch-action (touch drags scroll and cancel), and per-move deltas are
// stacked onto the transform: the sheet accelerates away from the pointer.
onDrag(sheet, {
  onMove: ({ dx }) => {
    sheet.style.transform += ` translateX(${dx}px)`;
  },
});
```

**Correct (what is right):**

```tsx
import { onDrag } from "@hellajs/headless/utils";

const wireDrawer = (drawer: HTMLElement, onClose: () => void) => {
  drawer.style.touchAction = "none"; // the drag's contract: consumer-owned
  let start = 0;
  return onDrag(drawer, {
    onStart: () => {
      start = Number(drawer.dataset.x ?? 0);
    },
    onMove: ({ dx }) => {
      const x = Math.max(0, start + dx); // cumulative dx plus consumer clamping
      drawer.dataset.x = String(x);
      drawer.style.transform = `translateX(${x}px)`;
    },
    onEnd: () => {
      if (Number(drawer.dataset.x ?? 0) > 120) onClose();
    },
  });
};
```

Reference: `packages/headless/lib/utils/onDrag.ts` and `packages/headless/tests/ondrag.test.ts`
