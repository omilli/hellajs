---
title: Pass live getters where onOutside and layerDismissal expect them
impact: CRITICAL
impactDescription: a call-time node snapshot freezes membership - recreated portal content counts as outside and the layer instantly dismisses itself
tags: onOutside, layerDismissal, getters, portals
---

## Pass live getters where onOutside and layerDismissal expect them

`onOutside(targets, handler)` re-invokes the `targets` getter on every pointerdown and `layerDismissal(nodes, onDismiss)` re-invokes `nodes` per event - that re-resolution is the contract that keeps portal and dynamically recreated content inside. Closing over an array resolved once at wiring time (calling a ref getter at arming time and capturing its result) freezes membership: the moment the overlay recreates its node, the stale entry no longer `.contains` the press target and every press inside the new content fires the dismissal. Null entries are skipped on purpose - return `null` for not-yet-mounted members instead of dropping them from the array.

**Incorrect (what is wrong):**

```ts
import { onOutside } from "@hellajs/headless/utils";

// Snapshot: panel() resolved once, at wiring time. After the portal
// recreates the panel node, every press inside it reads as outside.
const inside = [panel()];
const dismiss = onOutside(() => inside, () => close());
```

**Correct (what is right):**

```ts
import { onOutside } from "@hellajs/headless/utils";

// Getter: re-resolved per pointerdown, so recreated portal content stays
// inside; null entries (nothing mounted yet) are skipped.
const arm = (
  overlay: () => HTMLElement | null,
  anchor: () => HTMLElement | null,
  close: () => void,
) => onOutside(() => [overlay(), anchor()], close);
```

Reference: `packages/headless/lib/utils/onOutside.ts` and `packages/headless/lib/utils/layerDismissal.ts`
