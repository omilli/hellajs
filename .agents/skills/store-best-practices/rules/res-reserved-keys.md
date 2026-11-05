---
title: Keep the $-prefixed method names out of initial state
impact: CRITICAL
impactDescription: any non-store initial object containing $snapshot, $update, $cleanup, or $subscribe throws at create time
tags: reserved keys, collisions, create time
---

## Keep the $-prefixed method names out of initial state

`$snapshot`, `$update`, `$cleanup`, and `$subscribe` are the store's method namespace - `createStore` defines them on every store. An initial object containing any of them throws at create time ("reserved key collision") for every value type, including functions, and `$update` rejects writes targeting them, so a store cannot be hijacked through its own update path. The one exemption is composition: passing an existing store as a value has its reserved keys recognized and skipped. Data keys never need the `$` prefix - keep state keys unprefixed.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

// Throws at create time: $snapshot is a reserved method name
const broken = store({
  count: 0,
  $snapshot: { version: 2 },
});
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

// Unprefixed data keys; the $ methods come with the store
const state = store({
  count: 0,
  snapshotVersion: 2,
});

const snap = state.$snapshot(); // the method, not a collision
```

Reference: `packages/store/lib/internal/utils.ts reservedKeys` and `packages/store/tests/reserved.test.ts` and `packages/store/docs/api/store.mdx`
