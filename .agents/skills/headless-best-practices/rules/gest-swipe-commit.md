---
title: Gate swipe actions on commit, not on move
impact: MEDIUM
impactDescription: acting inside onMove fires the action dozens of times per gesture, and releases missing both the distance threshold and the velocity floor must cancel back
tags: onSwipe, gesture, commit
---

## Gate swipe actions on commit, not on move

`onSwipe(el, handlers, options?)` composes `onDrag` (inheriting its primary-button and `[disabled]` guards and guarded capture) and samples moves into a rolling 100ms velocity window. On release, the dominant axis - the larger of `|dx|` and `|dy|`, its sign the direction - commits only when it traveled at least `threshold` px (default 50) OR its release velocity crossed the `velocity` floor in px/ms (default 0.5); every other release calls `onCancel`. Move-state changes (translation, opacity) belong in `onMove`; the action itself (dismiss, navigate) belongs in `onCommit` switched on `direction`, and visual restoration in `onCancel` - a fast short flick commits through velocity while well under the distance threshold, so partial drags must not act.

**Incorrect (what is wrong):**

```tsx
import { onSwipe } from "@hellajs/headless/utils";

// The action fires mid-gesture on every move past a rough threshold - a
// hesitant 41px drag dismisses a card the commit gate would have cancelled.
onSwipe(card, {
  onMove: ({ dx }) => {
    if (dx < -40) removeCard();
    card.style.transform = `translateX(${dx}px)`;
  },
});
```

**Correct (what is right):**

```tsx
import { onSwipe } from "@hellajs/headless/utils";

const wireCard = (card: HTMLElement, onRemove: () => void) =>
  onSwipe(
    card,
    {
      onMove: ({ dx }) => {
        card.style.transform = `translateX(${dx}px)`;
      },
      onCommit: ({ direction }) => {
        if (direction === "left") onRemove();
      },
      onCancel: () => {
        card.style.transform = "translateX(0)";
      },
    },
    { threshold: 80 },
  );
```

Reference: `packages/headless/lib/utils/onSwipe.ts` and `packages/headless/tests/onswipe.test.ts`
