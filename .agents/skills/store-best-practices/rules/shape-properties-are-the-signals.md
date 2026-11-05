---
title: Read and write store state through the property calls
impact: HIGH
impactDescription: reassignment throws a TypeError and wrapper-object reads see undefined, so state changes never land
tags: property access, signals, non-writable, TypeError
---

## Read and write store state through the property calls

`store(initial)` converts each property into the reactive primitive itself: primitives become `@hellajs/core` signals, nested plain objects become nested stores, collections become granular containers. There is no wrapper object and no proxy - read by calling the property (`settings.theme()`), write by calling it with a value (`settings.theme("dark")`, `settings.user.name("Bob")`). Data properties and the `$`-prefixed methods are defined non-writable, so `settings.theme = "dark"` throws a TypeError in strict-mode ESM instead of updating state; function properties are the one swappable exemption.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const settings = store({ theme: "light", user: { name: "Ada" } });

// Data properties are non-writable: strict-mode ESM throws a TypeError
settings.theme = "dark";

// No wrapper object exists: .value reads undefined, the signal never runs
const userName = settings.user.value.name;
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const settings = store({ theme: "light", user: { name: "Ada" } });

const theme: string = settings.theme(); // read
settings.theme("dark"); // write
settings.user.name("Bob"); // nested write wakes only name readers
```

Reference: `packages/store/lib/internal/utils.ts defineStoreProperty` and `packages/store/lib/types.d.ts Store` and `packages/store/tests/data.test.ts`
