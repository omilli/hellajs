---
title: Handle errors inside computed, not at read sites
impact: HIGH
impactDescription: an unhandled throw re-executes the getter on every read and rethrows, and dependencies read after the throw point are pruned
tags: computed, errors, tracking
---

## Handle errors inside computed, not at read sites

A throw inside a computed marks the node dirty again before rethrowing: every read re-executes the getter and rethrows, never serving the stale cache and never `undefined`. Dependencies read after the throw point are pruned by the run's cleanup, so the surviving subscription set is whatever was read before the failure. A `try`/`catch` inside the getter preserves tracking and yields a usable value on every read; reserve read-site handling for errors no fallback can absorb.

**Incorrect (what is wrong):**

```ts
import { computed, signal } from "@hellajs/core";

const raw = signal('{"n":1}');
// No inner handling: once raw holds invalid JSON, every read re-executes the
// getter and rethrows - callers cannot recover a value, only the error
const parsed = computed(() => JSON.parse(raw()) as { n: number });
```

**Correct (what is right):**

```ts
import { computed, signal } from "@hellajs/core";

const raw = signal('{"n":1}');
const parsed = computed(() => {
  try {
    return JSON.parse(raw()) as { n: number };
  } catch {
    return { n: 0 }; // fallback: every read stays usable, tracking preserved
  }
});
console.log(parsed().n);
```

Reference: `packages/core/lib/internal/execution.ts updateComputed` and `packages/core/tests/computed.test.ts` and `packages/core/docs/api/computed.mdx`
