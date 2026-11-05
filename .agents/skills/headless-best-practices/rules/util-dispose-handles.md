---
title: Call every util's dispose handle on teardown
impact: CRITICAL
impactDescription: trapFocus, onOutside, hoverIntent, and layerDismissal listen on document and anchorPosition on window - a discarded handle leaks live global listeners against detached nodes
tags: cleanup, dispose, listeners, leak
---

## Call every util's dispose handle on teardown

Every wiring util returns a dispose handle, and the heaviest listeners sit on `document` (`trapFocus`, `onOutside`, `hoverIntent`, `layerDismissal`) or `window` (`anchorPosition`) - the wiring outlives the observed element, so removing the element does not remove the listener. A discarded handle leaks a global listener that keeps firing against detached closures for the rest of the app. Store the handle at arming time and call it in the path that closes or tears the surface down: the dismissal handler itself, the owning effect's cleanup, or an unmount hook. The component factories arm and drain these for you - manual arming is the case that must clean up after itself.

**Incorrect (what is wrong):**

```ts
import { onOutside } from "@hellajs/headless/utils";

// Handle discarded: the document pointerdown listener stays armed forever;
// every future outside press invokes a handler over a dead panel.
onOutside(() => [panel()], () => close());
```

**Correct (what is right):**

```ts
import { onOutside } from "@hellajs/headless/utils";

const openPanel = (panel: HTMLElement) => {
  const dismiss = onOutside(() => [panel], () => {
    panel.hidden = true;
    dismiss(); // the handler owns its teardown
  });
  panel.hidden = false;
};
```

Reference: `packages/headless/lib/utils/onOutside.ts` and `packages/headless/tests/onoutside.test.ts`
