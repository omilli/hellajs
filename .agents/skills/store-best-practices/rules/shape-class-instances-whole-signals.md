---
title: Class-instance leaves are whole-value signals
impact: HIGH
impactDescription: in-place mutation of a Date, RegExp, or custom instance wakes no subscriber, silently losing reactivity
tags: class instances, Date, RegExp, granularity, mutation
---

## Class-instance leaves are whole-value signals

Conversion recurses only into plain objects - `Date`, `RegExp`, and custom class instances are not plain objects, so each becomes a single signal holding the instance (class instances stay settable like primitives). Reading `session.startedAt()` returns the live instance; mutating it in place changes the object the signal already holds without any signal write, so no subscriber ever wakes - the change is invisible to every effect. Write a new instance through the property call to notify readers.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const session = store({ startedAt: new Date(2026, 0, 1) });

// Mutates the instance the signal already holds: no write, no wake
session.startedAt().setFullYear(2024);
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const session = store({ startedAt: new Date(2026, 0, 1) });

// A new instance through the signal is a real write; readers wake
session.startedAt(new Date(2024, 0, 1));
```

Reference: `packages/store/lib/internal/create.ts materializeKey` and `packages/store/docs/concepts/state.mdx` and `packages/store/tests/equals.test.ts`
