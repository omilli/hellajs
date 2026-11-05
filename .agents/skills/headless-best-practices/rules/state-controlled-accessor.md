---
title: A controlled accessor reports; it never flips internal state
impact: CRITICAL
impactDescription: passing a getter and expecting the factory to write it leaves a dead trigger - onOpenChange reports the request and nothing else moves
tags: controlled, accessor, onOpenChange, open
---

## A controlled accessor reports; it never flips internal state

Every stateful factory resolves its state one way: pass an ACCESSOR (`open?: () => boolean`, `value?: () => string`, `checked?: boolean | (() => boolean)`, ...) and the factory is controlled - it never writes any internal state; the trigger, dismissal, and selection paths call `onOpenChange`/`onValueChange`/`onCheckedChange` with the requested value and YOU write your signal in that callback. Omit the accessor (or pass a plain boolean/array where the option accepts a seed) and state is internal - the factory flips it itself. Two consequences agents get wrong: a controlled accessor's external write notifies no one (`onOpenChange` reports factory-driven flips only - a controller-driven flip is your own change), and passing a getter while never writing in the callback makes the surface visibly dead (the trigger reports and nothing opens). The seed options (`defaultValue`, `defaultOpen`, `defaultValues`) are for uncontrolled mode only.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { popover } from "@hellajs/headless";

const open = signal(false);
// Controlled accessor but no write in the callback: the trigger toggles
// nothing - open stays false forever and the popover is dead.
const Popover = popover({ open: () => open() });
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { popover, toggleGroup } from "@hellajs/headless";

const open = signal(false);
const Popover = popover({
  open: () => open(),
  onOpenChange: (next) => open(next), // the controller writes its signal
});

const size = signal("m");
const Size = toggleGroup({
  value: () => size(),
  onValueChange: (next) => {
    if (typeof next === "string") size(next); // "" reports a single-mode deselect
  },
});
```

Reference: `packages/headless/lib/internal/press.ts` and `packages/headless/lib/popover.tsx` and `packages/headless/tests/popover.test.ts`
