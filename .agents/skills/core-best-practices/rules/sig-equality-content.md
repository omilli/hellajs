---
title: Configure content equality for structured signal values
impact: HIGH
impactDescription: default reference equality propagates every fresh object or array literal, re-running downstream effects on content-equal writes
tags: signals, equality, performance
---

## Configure content equality for structured signal values

Every new object or array reference propagates by default. When callers rebuild structured values (spread updates, mapper output, parsed payloads), install an `equals` comparator: returning `true` skips the write entirely, keeps the old reference, and stops propagation. Default equality already treats `NaN` as self-equal and `+0`/`-0` as equal; pass `Object.is` as `equals` when `+0`/`-0` must differ. Comparators run against the freshest staged value, so sequential writes compare against the last write, not the initial value.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const todos = signal([{ id: 1 }]);
effect(() => {
  console.log(todos().length);
});
todos([{ id: 1 }]); // new array literal: reference-unequal, the effect re-runs for nothing
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const todos = signal([{ id: 1 }], {
  equals: (a, b) => a.length === b.length && a.every((t, i) => t.id === b[i]?.id),
});
effect(() => {
  console.log(todos().length);
});
todos([{ id: 1 }]); // content-equal: write skipped, no propagation
todos([{ id: 2 }]); // content-changed: propagates
```

Reference: `packages/core/lib/signal.ts` and `packages/core/tests/signal-equality.test.ts` and `packages/core/docs/concepts/reactivity.mdx`
