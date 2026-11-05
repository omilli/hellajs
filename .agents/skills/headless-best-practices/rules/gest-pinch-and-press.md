---
title: Track two-pointer pinches with onPinch; press timers fire only when configured
impact: MEDIUM
impactDescription: composing onDrag for pinch loses the second pointer to its single-pointer capture, and an un-opted single tap never fires
tags: onPinch, onLongPress, onDoubleTap
---

## Track two-pointer pinches with onPinch; press timers fire only when configured

`onPinch(el, handlers)` owns its two-pointer map - the first two primary-button pointers join (a third is ignored), each captured - because `onDrag` is single-pointer and its capture model fights two-pointer tracking: never compose two drags into a pinch. The second pointer's landing starts the gesture with a baseline of the pair's distance and centroid; moves report `scale` (current over baseline distance) and centroid `dx`/`dy`; either tracked pointer ending fires `onEnd` once, and a fresh second pointer re-baselines. `onLongPress(el, handler, options?)` fires once when a press outlives `duration` (default 500); drift beyond `tolerance` px (default 8) - scrolling - clears it, and CSS `:active` keeps immediate press feedback. `onDoubleTap(el, { onDoubleTap })` pairs taps whose pointerups land within 8px, inside `interval` (default 250); `onSingleTap` is OPT-IN and fires with the first tap's event only after the interval expires - single-tap handling that must be immediate belongs elsewhere.

**Incorrect (what is wrong):**

```ts
import { onDrag } from "@hellajs/headless/utils";

// Two onDrag wirings fake a pinch: the first pointer's capture owns the
// element and the second gesture's move stream never arrives intact.
onDrag(canvas, { onMove: ({ dx }) => trackFirst(dx) });
onDrag(canvas, { onMove: ({ dy }) => trackSecond(dy) });
```

**Correct (what is right):**

```ts
import { onDoubleTap, onLongPress, onPinch } from "@hellajs/headless/utils";

const wireSurface = (surface: HTMLElement, picker: HTMLElement) => {
  surface.style.touchAction = "none"; // pinch and press consumers own it
  const disposePinch = onPinch(surface, {
    onMove: ({ scale, dx, dy }) => {
      surface.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    },
    onEnd: () => {
      surface.style.transform = "translate(0px, 0px) scale(1)";
    },
  });
  const disposePress = onLongPress(
    surface,
    (event) => {
      picker.style.left = `${event.clientX}px`;
      picker.style.top = `${event.clientY}px`;
      picker.hidden = false;
    },
    { duration: 400 },
  );
  const disposeDoubleTap = onDoubleTap(surface, {
    onDoubleTap: () => {
      surface.style.transform = "scale(2)";
    },
  });
  return () => {
    disposePinch();
    disposePress();
    disposeDoubleTap();
  };
};
```

Reference: `packages/headless/lib/utils/onPinch.ts` and `packages/headless/lib/utils/onLongPress.ts` and `packages/headless/lib/utils/onDoubleTap.ts`
