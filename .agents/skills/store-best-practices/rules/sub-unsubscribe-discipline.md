---
title: Call the unsubscribe function every subscription returns
impact: CRITICAL
impactDescription: a dropped unsubscribe leaks the subscription effect - the callback and everything it captures outlive the consumer
tags: unsubscribe, leak, teardown, effect
---

## Call the unsubscribe function every subscription returns

`$subscribe` returns an unsubscribe function (a core effect disposer). Dropping it leaves the effect alive for the rest of the session: the callback keeps firing on every write and pins everything its closure captures. Call the disposer when the consumer unmounts - component teardown, route leave, test end; calling it more than once is safe.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const stats = store({ score: 0 });

// Return value dropped: the subscription can never be undone
stats.$subscribe("score", (next) => updateScoreboard(next));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function updateScoreboard(score: number) {}

const stats = store({ score: 0 });

// Keep the disposer and call it on teardown (idempotent)
const stopScore = stats.$subscribe("score", (next) => updateScoreboard(next));

function teardown() {
  stopScore();
}
```

Reference: `packages/store/lib/types.d.ts $subscribe` and `packages/store/tests/subscribe.test.ts` and `packages/store/docs/api/store.mdx`
