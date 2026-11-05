---
title: Compose stores by embedding, subscribe on the owner
impact: MEDIUM
impactDescription: subscribing through a parent on a nested store's key throws, so observation silently fails to attach
tags: composition, nested stores, shared signals, subscribe
---

## Compose stores by embedding, subscribe on the owner

Passing an existing store as a value inside another store's initial object composes them: the nested store's data signals are shared by reference, so writes propagate in both directions (`appStore.user.name("Bob")` also updates `userStore`) and snapshots flatten through. Composition preserves each store's own config - a readonly store stays readonly inside a writable parent and a writable one stays writable inside a readonly parent. Observation follows ownership: `$subscribe` gates on the store's own settable-key registry, and a nested store's key is not signal-backed, so `appStore.$subscribe("user", ...)` throws. Subscribe through the store that owns the key.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const userStore = store({ name: "Ada" });
const appStore = store({ user: userStore, version: 1 });

// Throws: "user" is a nested-store key, not a signal-backed one
appStore.$subscribe("user", (next) => renderUser(next));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function renderUser(name: string) {}

const userStore = store({ name: "Ada" });
const appStore = store({ user: userStore, version: 1 });

// Subscribe through the owning store
const stop = userStore.$subscribe("name", (next) => renderUser(next));
stop();

// Writes propagate both directions across the shared signals
appStore.user.name("Bob");
userStore.$update({ name: "Grace" }); // deep merge through the owner flows too
```

Reference: `packages/store/tests/nested.test.ts` and `packages/store/lib/internal/create.ts createStore` and `packages/store/docs/concepts/state.mdx`
