---
title: Use collection signals for lists, maps, and sets
impact: HIGH
impactDescription: whole-container signals wake every reader on any element change, the exact churn the collection signals exist to prevent
tags: signals, collections, performance
---

## Use collection signals for lists, maps, and sets

`signalArray`, `signalMap`, and `signalSet` maintain one child signal per element plus a structural version signal. A value write (`set(i, v)`, map `set(k, v)`) wakes only that element's readers; structural operations (`push`, `pop`, `splice`, `insert`, `delete`) reorder nodes and bump the version with zero child writes. A plain `signal(items[])` forces a whole-array replacement for every element edit, waking every reader of every element. Prefer `signalMap`'s `entry(k)` for stable per-key handles and `signalSet`'s `has(v)` for per-value membership tracking; calling the container with no arguments reads a fresh snapshot that tracks everything.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const names = signal(["Ada", "Grace"]);
effect(() => {
  console.log(names()[0]);
});
// One element appended via whole-array replacement: every reader of every
// element wakes on the new reference
names([...names(), "Barbara"]);
```

**Correct (what is right):**

```ts
import { effect, signalArray } from "@hellajs/core";

const names = signalArray(["Ada", "Grace"]);
effect(() => {
  console.log(names.get(0)); // wakes on element-0 writes and structural changes
});
names.set(0, "Ada Lovelace"); // one child write: element-0 readers only
names.push("Barbara"); // structural: version bump, positional readers wake
console.log(names.length()); // tracks the version only
```

Reference: `packages/core/lib/signalArray.ts` and `packages/core/lib/signalMap.ts` and `packages/core/lib/signalSet.ts` and `packages/core/docs/api/signalarray.mdx` and `packages/core/docs/concepts/reactivity.mdx`
