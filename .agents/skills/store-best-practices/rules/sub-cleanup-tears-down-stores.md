---
title: $cleanup tears down nested stores, not leaf signals
impact: MEDIUM
impactDescription: expecting cleanup to stop effects on leaf signals leaves them running - cleanup disposes store structure only
tags: cleanup, teardown, signals survive, element stores
---

## $cleanup tears down nested stores, not leaf signals

`$cleanup()` recursively invokes cleanup on nested stores and collection element stores - the structural members of the tree. Individual leaf signals are functions and are never disposed: they stay functional, so effects reading `todos.items` keep firing after `$cleanup()`. Cleanup is idempotent, does not null properties (the store object stays intact and readable), and never invokes preserved user functions. Use it to tear down a subtree's element stores; use each effect's own disposer, or `$subscribe`'s unsubscribe, to stop leaf-level observation.

**Incorrect (what is wrong):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const todos = store({ items: [{ text: "a", done: false }] });

effect(() => {
  void todos.$snapshot().items.length;
});

todos.$cleanup();

// Wrong expectation: the effect above keeps running - leaf signals survive
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const todos = store({ items: [{ text: "a", done: false }] });

// Own the effect disposer for leaf-level teardown
const dispose = effect(() => {
  void todos.$snapshot().items.length;
});

dispose(); // stops the effect
todos.$cleanup(); // tears down the element stores of the tree
```

Reference: `packages/store/lib/internal/create.ts $cleanup` and `packages/store/tests/cleanup.test.ts` and `packages/store/docs/api/store.mdx`
