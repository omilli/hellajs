---
title: $subscribe observes one settable key on the owning store
impact: HIGH
impactDescription: subscribing to a nested-store, function, or reserved key throws, so observation never attaches
tags: subscribe, settable keys, untracked, next, prev
---

## $subscribe observes one settable key on the owning store

`$subscribe(key, callback)` wraps a core effect over one signal-backed property. It throws for anything outside the store's settable-key registry: nested-store keys, preserved functions, reserved keys, unknown keys. The callback receives `(next, prev)` on writes only - never the initial value - and runs untracked, so signal reads inside it never widen the subscription. Readonly keys are observable read-only: subscribing is legal but the callback never fires. Collection keys are container-level: structural operations and whole-collection writes fire, element field writes never do.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const app = store({ user: { name: "Ada" }, version: 1 });

// Throws: "user" is a nested store, not a signal-backed key
app.$subscribe("user", (next) => renderUser(next));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function audit(message: string) {}

const app = store({ user: { name: "Ada" }, version: 1 });

// Observe a settable leaf; callback runs untracked with (next, prev)
const stop = app.$subscribe("version", (next, prev) => {
  audit(`version ${String(prev)} -> ${String(next)}`);
});
stop();
```

Reference: `packages/store/lib/internal/create.ts $subscribe` and `packages/store/tests/subscribe.test.ts` and `packages/store/docs/api/store.mdx`
