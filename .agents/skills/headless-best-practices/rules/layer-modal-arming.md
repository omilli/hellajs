---
title: Arm modal panels with modal, not hand-rolled traps
impact: HIGH
impactDescription: manually arming trapFocus, onEscape, and onOutside at mount leaves them armed after close and never re-arms on reopen
tags: modal, dialog, focus trap, dismissal
---

## Arm modal panels with modal, not hand-rolled traps

`modal(node, { state, onClose, escape, outside, onExited })` registers one re-arm effect over the `state` getter: while it reads `"open"`, `onEscape` and `onOutside` arm (both only when `onClose` exists - a missing `onClose` leaves both off, nothing throws) plus `trapFocus`; the flip to `"closed"` disarms them immediately; reopening re-arms; node removal drains everything. Node-scoped: no cleanup arrays, no dispose handle - the wiring is owned by the element's lifetime. `state` must be a live getter (`() => open() ? "open" : "closed"`), never a captured string. `onExited` rides node-lifetime `animationend` (unfiltered - bubbled child animations count) and the node's own transform `transitionend` (the drawer exit channel), gated on `state() === "closed"` and kept through the close flip so the exit animation finishes. Hand-rolling the three utils in a mount hook arms once, leaks on close, and re-arms on nothing.

**Incorrect (what is wrong):**

```tsx
import { onEscape, onOutside, trapFocus } from "@hellajs/headless/utils";

// Armed once at mount: the trap and dismissal stay live after close, and
// reopening the panel re-arms nothing.
const Panel = (props: { hook?: Record<string, unknown> }) => (
  <div
    role="dialog"
    hook:afterMount={(node) => {
      if (!(node instanceof HTMLElement)) return;
      trapFocus(node);
      onEscape(node, () => closePanel());
      onOutside(() => [node], () => closePanel());
    }}
  >
    Panel body
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { modal } from "@hellajs/headless/utils";

const open = signal(false);
const unmount = (): void => undefined;

const Sheet = () => (
  <div
    role="dialog"
    hook:afterMount={(node) => {
      if (!(node instanceof HTMLElement)) return;
      modal(node, {
        state: () => (open() ? "open" : "closed"), // live getter: re-arms per flip
        onClose: () => open(false),
        onExited: unmount, // exit animationend while closed
      });
    }}
  >
    Sheet body
  </div>
);
```

`dialog`'s `Content` arms this engine for you; reach for `modal` directly only on hand-built panels.

Reference: `packages/headless/lib/utils/modal.ts` and `packages/headless/docs/api/modal.mdx`
