---
title: $snapshot() returns a point-in-time copy, never live state
impact: CRITICAL
impactDescription: a captured snapshot never updates and writes into it never reach the store, so effects reading it go stale forever
tags: snapshot, copy, staleness, reactivity
---

## $snapshot() returns a point-in-time copy, never live state

`$snapshot()` is a computed that flattens the whole tree into a fresh plain object: nested stores and collection element stores unwrap to plain values, functions report the original references. The result is a copy - mutating it never reaches the store, and a reference captured once freezes at that moment. Call `$snapshot()` fresh inside each tracking context: inside an effect it re-runs on any change because the computed subscribes to every underlying signal. For targeted observation prefer the property signals or `$subscribe`.

**Incorrect (what is wrong):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const cart = store({ items: 2, total: 40 });

// Captured once at module scope: state freezes here forever
const state = cart.$snapshot();

effect(() => {
  // Never re-runs - state is a detached plain object
  badge.textContent = String(state.items);
});
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const cart = store({ items: 2, total: 40 });
const badge = { textContent: "" };

effect(() => {
  // Fresh read inside the effect: any change re-runs it
  badge.textContent = String(cart.$snapshot().items);
});

// For one key, subscribe without flattening the tree
const stop = cart.$subscribe("items", (next) => {
  badge.textContent = String(next);
});
stop();
```

Reference: `packages/store/lib/internal/create.ts snapshotComputed` and `packages/store/tests/snapshot.test.ts` and `packages/store/docs/api/store.mdx`
