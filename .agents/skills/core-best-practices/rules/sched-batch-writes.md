---
title: Batch multi-signal writes
impact: HIGH
impactDescription: each unbatched write flushes effects immediately, so N related writes re-run their effects N times
tags: batch, scheduling, performance
---

## Batch multi-signal writes

Outside a batch, every signal write drains the effect queue synchronously: two related writes run a subscribed effect twice, with the first run observing a half-updated state. `batch(fn)` increments a depth counter and defers the flush to the outermost exit, so effects observe the final state once. Nested batches drain at the outermost boundary. Batching is synchronous only: async work scheduled inside escapes the boundary.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const first = signal("");
const last = signal("");
effect(() => {
  console.log(first(), last());
});
first("Ada"); // flush: the effect runs on half-updated state
last("Lovelace"); // flush: the effect runs again
```

**Correct (what is right):**

```ts
import { batch, effect, signal } from "@hellajs/core";

const first = signal("");
const last = signal("");
effect(() => {
  console.log(first(), last());
});
batch(() => {
  first("Ada");
  last("Lovelace");
}); // one flush at the outermost exit: the effect runs once
```

Reference: `packages/core/lib/batch.ts` and `packages/core/tests/batch.test.ts` and `packages/core/docs/api/batch.mdx`
