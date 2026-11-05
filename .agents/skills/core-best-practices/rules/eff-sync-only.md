---
title: Keep effect bodies synchronous
impact: CRITICAL
impactDescription: an async effect returns before reading dependencies, so nothing is tracked and the effect never re-runs
tags: effect, async, tracking
---

## Keep effect bodies synchronous

Dependency tracking is active only while the effect function runs synchronously. An `async` function returns a pending `Promise` at the first `await`; the tracking context is already restored by then, so every signal read after the first `await` subscribes nothing. The effect executes once and never re-runs. Keep the body synchronous, and start async work (fetch, timers, promises) inside the sync body, resolving results by writing signals from `.then` callbacks.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
const latest = signal(0);
effect(async () => {
  await Promise.resolve(); // returns to the microtask queue: tracking context gone
  latest(count()); // untracked read - this effect never re-runs on count
});
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
const latest = signal(0);
effect(() => {
  const value = count(); // tracked: read in the synchronous body
  void Promise.resolve(value).then((v) => latest(v)); // async resolves via a signal write
});
```

Reference: `packages/core/lib/effect.ts` and `packages/core/tests/effects.test.ts` and `packages/core/docs/api/effect.mdx`
