---
title: Collect effects in scopes and dispose on teardown
impact: HIGH
impactDescription: discarded disposers leave effects running forever after teardown, firing ghost side effects on every write
tags: scope, effect, lifecycle
---

## Collect effects in scopes and dispose on teardown

Every effect returns a disposer, and every disposer discarded is a leak: the effect keeps re-running on its dependencies long after the view or feature it served is gone. Wrap effect creation in `scope(fn)`: it collects every effect created inside the callback and returns a single cleanup that disposes them all. Call it at teardown; the call is idempotent, and an empty scope returns a shared no-op.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
function mount(): void {
  // Disposers discarded: these effects keep firing on every count write
  // after teardown
  effect(() => {
    console.log("count:", count());
  });
}
```

**Correct (what is right):**

```ts
import { effect, scope, signal } from "@hellajs/core";

const count = signal(0);
function mount(): () => void {
  return scope(() => {
    effect(() => {
      console.log("count:", count());
    });
    effect(() => {
      console.log("doubled:", count() * 2);
    });
  });
}
const stop = mount();
stop(); // disposes both effects; a second call is a safe no-op
```

Reference: `packages/core/lib/scope.ts` and `packages/core/tests/scope.test.ts` and `packages/core/docs/api/scope.mdx`
