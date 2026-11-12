---
title: Trust auto-batching for same-tick writes
impact: HIGH
impactDescription: hand-rolling write sequencing or reaching for removed batching APIs fights the scheduler the library already runs
tags: scheduling, flush, performance
---

## Trust auto-batching for same-tick writes

Signal writes coalesce automatically: each write propagates and dirt-marks immediately, then one `queueMicrotask` drain runs the effects once with final values. Two related writes in the same tick (event handler, store `$update`, loop) never run a subscribed effect twice, and no intermediate state is ever observed. Reads stay synchronous: a signal getter or computed read between the writes returns the fresh committed value before any effect runs. Reach for `flush()` only when the effects must run before the next line; `batch` is not part of the API.

**Incorrect (what is wrong):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const first = signal("");
const last = signal("");
effect(() => {
  console.log(first(), last());
});
flush(); // Redundant noise: nothing has been written yet
first("Ada");
flush(); // Manual drain per write: effects run before the second write lands
last("Lovelace");
flush();
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const first = signal("");
const last = signal("");
effect(() => {
  console.log(first(), last());
});
first("Ada");
last("Lovelace"); // One drain at the microtask boundary: the effect runs once
```

Reference: `packages/core/lib/internal/scheduler.ts scheduleFlush` and `packages/core/tests/deferred-flush.test.ts` and `packages/core/docs/api/flush.mdx`
