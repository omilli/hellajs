---
title: Grow stores through the reference $update returns
impact: MEDIUM
impactDescription: added keys widen only the returned reference, so reading them off the original reference is a stale-type trap and draft adds stay untyped
tags: added keys, widening, materialize, future keys
---

## Grow stores through the reference $update returns

`$update` materializes keys absent from the initial object - there is no `set` API and no pre-declared option. The widening is typed on the return only: the partial-path overload returns the store widened by the partial's new keys, while the original reference's type stays stale (the `Object.assign` seam). Capture the returned reference to read added keys type-safely. The draft path materializes runtime adds too, but the mutator is typed against the current shape, so draft adds stay untyped - the direct partial is the typed way to grow a store. Added keys join the settable registry for later writes and subscriptions but get no middleware or equals; those are keyed by the creation shape. Readonly stores and readonly keys reject additions.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const session = store({ user: "ada" });

session.$update({ expiresAt: 1234 });

// Stale type on the original reference: expiresAt does not exist on it
session.expiresAt();
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function checkExpiry(at: number) {}

const session = store({ user: "ada" });

// The widened reference types the added key
const grown = session.$update({ expiresAt: 1234 });
grown.expiresAt(); // number
grown.$subscribe("expiresAt", (next) => checkExpiry(next));
```

Reference: `packages/store/lib/types.d.ts $update` and `packages/store/tests/future.test.ts` and `packages/store/docs/api/store.mdx`
