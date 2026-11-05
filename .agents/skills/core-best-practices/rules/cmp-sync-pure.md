---
title: Keep computed synchronous and side-effect free
impact: CRITICAL
impactDescription: an async computed caches the Promise itself instead of the payload, and writes inside a derivation re-enter propagation mid-evaluation
tags: computed, async, purity
---

## Keep computed synchronous and side-effect free

The computed getter runs synchronously inside the graph's evaluation context; dependencies are whatever signals it reads before returning. An `async` getter returns a pending `Promise` on first read and that Promise becomes the cached value: subscribers receive a promise, never the resolved payload, and every signal read after the first `await` happens outside the tracking context and subscribes nothing. Writing signals inside a derivation is equally wrong: it mutates graph state during evaluation. Derive values only; put side effects in `effect`, and resolve async work by writing a signal from `.then` callbacks.

**Incorrect (what is wrong):**

```ts
import { computed, signal } from "@hellajs/core";

const userId = signal(1);
const profile = computed(async () => {
  const res = await fetch(`/api/users/${userId()}`);
  return res.json();
});
// The cached value is the Promise itself, never the fetched payload, and
// any signal read after the first await subscribes nothing
```

**Correct (what is right):**

```ts
import { computed, signal } from "@hellajs/core";

const userId = signal(1);
const userKey = computed(() => `user-${userId()}`); // sync, pure, tracked
```

Async data belongs in a signal written from an effect's `.then` chain (see the synchronous-effects rule).

Reference: `packages/core/lib/computed.ts` and `packages/core/docs/api/computed.mdx` and `packages/core/docs/concepts/reactivity.mdx`
