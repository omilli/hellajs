---
title: Reach for flush only to drain a stalled queue
impact: LOW
impactDescription: misunderstanding the abort behavior leaves queued effects stranded until an unrelated write drains them
tags: flush, scheduler, errors
---

## Reach for flush only to drain a stalled queue

`flush()` is the scheduler's synchronous drain, exported for advanced and testing use. Normal writes schedule their own microtask drain, so explicit `flush()` calls in application code are noise unless effects must run before the next line. One real use: when an effect throws, the drain aborts with the remaining queue entries intact but unrun. On the scheduled path the throw dispatches to the handler registered with `setFlushErrorHandler` when one is registered (dom's errors feature registers its `onError` dispatch), and surfaces as an unhandled microtask rejection otherwise; a manual `flush()` throws to the caller and never dispatches. Swallowing either strands the survivors; a bare `flush()` in the recovery path runs each exactly once.

**Incorrect (what is wrong):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const count = signal(0);
effect(() => {
  if (count() === 1) throw new Error("boom");
});
count(1); // The scheduled drain aborts at the throw (unhandled rejection)
// Swallowed: effects queued after the throwing one never ran and stay
// queued until some later write happens to drain them
```

**Correct (what is right):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const count = signal(0);
effect(() => {
  if (count() === 1) throw new Error("boom");
});
count(1); // Schedules the drain
try {
  flush(); // The manual drain aborts at the throw; later-queued effects survive
} catch {
  flush(); // Recovers the surviving queue entries, each exactly once
}
```

Reference: `packages/core/lib/internal/scheduler.ts flush` and `packages/core/tests/flush-errors.test.ts` and `packages/core/docs/api/flush.mdx`
