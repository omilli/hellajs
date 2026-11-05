---
title: Mount one Toaster and drive toasts through the module API
impact: HIGH
impactDescription: two Toasters render every card twice, and per-app toast state held outside the module can never reach the stack
tags: toast, Toaster, ToastItem
---

## Mount one Toaster and drive toasts through the module API

The toast system is a module-level singleton: one global queue signal (three-visible cap retiring oldest first, hover-paused countdowns, swipe dismissal past 45% of the card width) driven by the `toast` callable, `toast.promise` (sticky loading card that swaps to the success or error flavor on settle), and `toast.dismiss(id?)`. `Toaster` is the portaled render of that queue - mount it ONCE per app; every additional mount renders the same records again. Do not hold toast state in your own signals or try to render cards yourself: enqueue through the API and let the stack own dismissal, timers, and the exit splice (`data-removed` holds a card for its 200ms exit). `ToastItem` is the util-bearing card (data attributes, hover pause, swipe); pass it as `Toaster`'s children render function to restyle while keeping the wiring.

**Incorrect (what is wrong):**

```tsx
import { toast, Toaster } from "@hellajs/headless";

// Two mounted Toasters: the shared queue renders in both stacks - every
// toast appears twice and dismissing one leaves its twin.
const App = () => (
  <div>
    <Sidebar>
      <Toaster position="bottom-left" />
    </Sidebar>
    <Main>
      <Toaster position="bottom-right" />
    </Main>
  </div>
);
```

**Correct (what is right):**

```tsx
import { toast, ToastItem, Toaster } from "@hellajs/headless";

const persist = (): Promise<void> => Promise.resolve();
const saveSettings = (): void => {
  toast.promise(persist(), {
    loading: "Saving...",
    success: "Settings saved",
    error: "Save failed",
  });
};
const dismissAll = (): void => toast.dismiss();

const App = () => (
  <div>
    <button on:click={saveSettings}>Save</button>
    <button on:click={dismissAll}>Dismiss all</button>
    <Toaster position="bottom-right">
      {(record) => <ToastItem record={record} richColors />}
    </Toaster>
  </div>
);
```

`duration: Infinity` sticks a toast; `resetHeadless()` empties the queue for tests.

Reference: `packages/headless/lib/toast.tsx` and `packages/headless/tests/toast.test.tsx`
