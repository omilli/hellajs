---
title: Replace signal values, never mutate in place
impact: CRITICAL
impactDescription: in-place mutation keeps the old reference, so subscribers are never notified and readers see stale derived state
tags: signals, equality, mutation
---

## Replace signal values, never mutate in place

Change detection compares references by default (`isEqual` in `lib/internal/utils.ts`: `a === b` with `NaN` self-equal). The setter stages a new value and propagates only when the reference differs; mutating the stored object or array leaves the reference identical, so the write block never runs, no subscriber is notified, and every computed/effect reading the signal keeps serving the pre-mutation view it already rendered. Always build and set a new object or array.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const user = signal({ name: "Ada", role: "admin" });
effect(() => {
  console.log(user().role);
});
// Same reference after mutation: no propagation, the effect never re-runs
user().role = "owner";
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const user = signal({ name: "Ada", role: "admin" });
effect(() => {
  console.log(user().role);
});
// New reference: the equality gate sees the change and propagates
user({ ...user(), role: "owner" });
```

For element-granular lists, prefer `signalArray` (see the collection rule) over spreading whole arrays.

Reference: `packages/core/lib/signal.ts` and `packages/core/lib/internal/utils.ts isEqual` and `packages/core/docs/api/signal.mdx`
