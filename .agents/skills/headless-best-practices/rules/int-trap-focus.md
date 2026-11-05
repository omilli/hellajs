---
title: Release trapFocus and let it own Tab wrapping
impact: HIGH
impactDescription: stacking a manual Tab handler on the trap double-wraps focus, and a never-released trap pins keyboard focus on a detached panel
tags: trapFocus, focus, a11y, dialog
---

## Release trapFocus and let it own Tab wrapping

`trapFocus(container, options?)` focuses `initialFocus()`'s result (or the first focusable) at trap time, intercepts Tab only when `activeElement` is exactly the first or last focusable (wrapping forward from the last, backward from the first), re-queries focusables on every keypress so dynamic children join the trap, and restores the pre-trap `activeElement` on release unless `restoreFocus: false`. Focus elsewhere inside falls through to the native Tab order, and pull-back from outside the container is deliberately absent. Do not stack a second Tab keydown handler on a trapped container - both call `preventDefault` and their focus targets disagree. Release the handle when the surface closes, or use `modal`/`dialog` which own the trap's lifecycle.

**Incorrect (what is wrong):**

```ts
import { trapFocus } from "@hellajs/headless/utils";

// A manual Tab wrapper next to the trap: both handlers preventDefault and
// disagree on the focus target, and the trap is never released.
trapFocus(panel);
panel.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  panel.querySelector<HTMLElement>("button")!.focus();
});
```

**Correct (what is right):**

```ts
import { trapFocus } from "@hellajs/headless/utils";

const panel = document.createElement("div");
const release = trapFocus(panel, {
  initialFocus: () => panel.querySelector<HTMLElement>("[data-autofocus]") ?? undefined,
});
const close = (): void => {
  release(); // restores the pre-trap activeElement
  panel.remove();
};
```

Reference: `packages/headless/lib/utils/trapFocus.ts` and `packages/headless/tests/trapfocus.test.ts`
