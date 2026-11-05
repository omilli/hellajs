---
title: Dispose the layer inside the layerDismissal handler
impact: CRITICAL
impactDescription: dismissal does not pop the shared stack - a layer closed without disposing wedges every layer beneath it
tags: layerDismissal, stacking, dismissal
---

## Dispose the layer inside the layerDismissal handler

`layerDismissal(nodes, onDismiss)` pushes onto a shared module-level stack; document capture-phase Escape and outside pointerdown fire `onDismiss` ONLY when this layer is top - stacked overlays (submenu over menu over popover) dismiss one at a time, outermost first. The dismissal itself does NOT pop the stack: `onDismiss` must close the surface AND call the dispose handle, which is what removes the entry. A handler that closes without disposing leaves a dead layer on top that silently absorbs every later Escape and outside press for the whole app. The same discipline applies to teardown paths that remove the node - dispose pops, so unmounting a layered surface must run the handle. `nodes` follows the same live-getter contract as `onOutside`.

**Incorrect (what is wrong):**

```ts
import { layerDismissal } from "@hellajs/headless/utils";

// Closes the panel but never disposes: the dead layer stays on top of the
// stack and swallows every future Escape and outside press.
const dismiss = layerDismissal(() => [panel()], () => {
  open.set(false);
});
```

**Correct (what is right):**

```ts
import { layerDismissal } from "@hellajs/headless/utils";

const armLayer = (panel: HTMLElement, close: () => void) => {
  const dispose = layerDismissal(() => [panel], () => {
    close();
    dispose(); // the handler must pop - dismissal does not
  });
  return dispose; // teardown paths dispose too: disposing pops the stack
};
```

Reference: `packages/headless/lib/utils/layerDismissal.ts` and `packages/headless/tests/layerdismissal.test.ts`
