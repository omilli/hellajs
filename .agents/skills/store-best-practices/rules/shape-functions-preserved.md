---
title: Function properties are behavior, not state
impact: MEDIUM
impactDescription: routing a function swap through $update throws, and a swapped function is not what $snapshot reports
tags: functions, preservation, snapshot, swap
---

## Function properties are behavior, not state

`store()` preserves function-valued properties as-is: they never become signals, never enter the settable registry, and `$update` refuses them - a function property throws "is a function property, not state - assign it directly", and a function value on a new key throws too. Swap a function by direct assignment; function properties are the one writable kind. Two follow-ons: `$snapshot()` reports the original `initial` function reference, not a later swap, and function values are dropped by JSON serialization, so they never persist. Keep only stable behavior inside the store; per-render callbacks belong outside it.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const editor = store({
  text: "",
  onSave: () => saveToServer(), // zero-arg handler: preserved as-is
});

// Throws: onSave is a function property, not state
editor.$update({ onSave: () => saveToServer() });
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function saveToServer() {}

const editor = store({
  text: "",
  onSave: () => saveToServer(),
});

// Function properties swap by direct assignment - the writable exemption
editor.onSave = () => saveToServer();
editor.$update({ text: "hello" }); // state flows through $update
```

The typing gate mirrors the runtime one: a function property types as preserved (and stays directly assignable) only when its signature accepts unknown arguments - zero-argument handlers always qualify, while a one-argument handler typed to a narrower parameter types as a signal holding the function.

Reference: `packages/store/lib/internal/create.ts materializeKey` and `packages/store/tests/functions.test.ts` and `packages/store/docs/api/store.mdx`
