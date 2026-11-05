---
title: Reach for flush only to drain a stalled queue
impact: LOW
impactDescription: misunderstanding the abort behavior leaves queued effects stranded until an unrelated write drains them
tags: flush, scheduler, errors
---

## Reach for flush only to drain a stalled queue

`flush()` is the scheduler's drain, exported for advanced and testing use. Normal writes flush on their own (immediately outside `batch`, at outermost batch exit inside it), so explicit `flush()` calls in application code are noise. One real use: when an effect throws, the drain aborts with the remaining queue entries intact but unrun. Swallowing that error strands the survivors; a bare `flush()` in the recovery path runs each exactly once.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
effect(() => {
  if (count() === 1) throw new Error("boom");
});
try {
  count(1); // the throw aborts the whole drain
} catch {
  // Swallowed: effects queued after the throwing one never ran and stay
  // queued until some later write happens to drain them
}
```

**Correct (what is right):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const count = signal(0);
effect(() => {
  if (count() === 1) throw new Error("boom");
});
try {
  count(1); // aborts the drain; later-queued effects survive, still queued
} catch {
  flush(); // recovers the surviving queue entries, each exactly once
}
```

Reference: `packages/core/lib/internal/scheduler.ts flush` and `packages/core/tests/flush.test.ts` and `packages/core/docs/api/flush.mdx`
