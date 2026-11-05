---
title: Let open surfaces exit through animationend under data-state
impact: HIGH
impactDescription: unmounting portaled content on the open flip kills the exit animation mid-frame, and an exit with no animationend handler never unmounts past the fallback budget
tags: dialog, popover, exit, animation, data-state
---

## Let open surfaces exit through animationend under data-state

Every overlay factory closes through a visible/exit machine: the flip to closed keeps the subtree MOUNTED under `data-state="closed"` while the exit CSS animates, and the unmount lands on the surface's own `animationend` (or a fallback budget, 250ms by default; `dialog`'s `fallbackMs` tunes it). Two consequences for consumers. First, key your exit CSS off `data-state="closed"` - that attribute, not a removal, is the exit trigger, and entry animationends are ignored (`onExited` reports only exits). Second, do not gate the members on the open signal yourself (`show() && <Content>`) - that unmounts the panel before the exit starts and skips the machine's mid-exit reopen semantics (a reopen during the exit clears the pending fallback and keeps the subtree). Portaled surfaces start closed - there is no open seed; drive the open state and let the members animate.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { dialog } from "@hellajs/headless";

const open = signal(false);
const Sheet = dialog();

// Gating on the open signal unmounts Content the frame the state flips -
// the exit animation never runs, so data-state="closed" CSS is dead code.
const SheetHost = () => (
  <div>
    <Sheet.Trigger>Open sheet</Sheet.Trigger>
    {open() ? <Sheet.Content>Sheet body</Sheet.Content> : null}
  </div>
);
```

**Correct (what is right):**

```tsx
import { dialog } from "@hellajs/headless";

const Sheet = dialog({ fallbackMs: 300 }); // budget for exits whose animationend never fires

const SheetHost = () => (
  <div>
    <Sheet.Trigger>Open sheet</Sheet.Trigger>
    <Sheet.Content escape outside={false}>
      Sheet body
      <Sheet.Close>Done</Sheet.Close>
    </Sheet.Content>
  </div>
);
```

`portal: false` renders the bare inline panel for manual compositions - no gate, no portal, no overlay; the exit notification is then the caller's alone.

Reference: `packages/headless/lib/internal/exitMachine.ts` and `packages/headless/lib/dialog.tsx` and `packages/headless/tests/dialog.test.tsx`
