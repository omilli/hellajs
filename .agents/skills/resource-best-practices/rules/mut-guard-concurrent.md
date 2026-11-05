---
title: Guard triggers that must not overlap
impact: HIGH
impactDescription: every mutate call runs independently, so an unguarded double-click fires two POSTs and double-creates rows or double-charges
tags: mutate, concurrent, double-click, isFetching
---

## Guard triggers that must not overlap

Concurrent `mutate()` calls are independent by design: each owns its abort controller, its `onMutate` context, and its settlement; a second call never aborts the first, and reads never abort mutations either (only `abort()` cancels everything). For operations that must not overlap - payments, row creation - guard the trigger while a mutation is in flight with `isFetching()` (true during mutation execution) or a disabled button state. For operations that may overlap, let them run: each call's `onSettled` receives its own context, so overlapping optimistic updates roll back independently.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const checkout = resource(
  async (cart: unknown) => (await fetch("/api/checkout", { method: "POST", body: JSON.stringify(cart) })).json(),
  {},
);
function onSubmit() {
  // Double-click: two independent mutations, two charges
  checkout.mutate({ items: [1, 2] }).catch(() => {});
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const checkout = resource(
  async (cart: unknown) => (await fetch("/api/checkout", { method: "POST", body: JSON.stringify(cart) })).json(),
  {},
);
function onSubmit() {
  if (checkout.isFetching()) return; // single-flight guard: ignore double-submits
  checkout.mutate({ items: [1, 2] }).catch(() => {});
}
```

Reference: `packages/resource/docs/concepts/resources.mdx` and `packages/resource/tests/mutations.test.ts`
