---
title: Drive collections through the container surface, never the bare-call copy
impact: HIGH
impactDescription: pushing into the fresh array a bare collection read returns mutates a throwaway copy and wakes no reader
tags: collections, arrays, maps, sets, SignalArray, reconcile
---

## Drive collections through the container surface, never the bare-call copy

Array, `Map`, and `Set` keys install granular containers (`signalArray`/`signalMap`/`signalSet` from `@hellajs/core`): plain-object elements convert to element stores, so a field write wakes exactly that field's readers. The write surface is the container's methods - structural operations (`push`, `pop`, `splice`, `insert`), element handles (`get(i)`, `set(i, patch)`, `Map.entry(k)`) - and the whole-callable write, which reconciles position-wise: equal positions write nothing, changed positions patch, length changes restructure. A bare read `todos.todos()` returns a fresh plain array snapshot of the current elements; mutating that copy notifies nobody. `$snapshot()` is the deep-plain form for rendering (element stores flattened to plain objects).

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const todos = store({
  todos: [{ id: 1, text: "write rules", completed: false }],
});

// Bare call returns a fresh plain array: the push lands in a throwaway copy
todos.todos().push({ id: 2, text: "verify", completed: false });
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const todos = store({
  todos: [{ id: 1, text: "write rules", completed: false }],
});

todos.todos.push({ id: 2, text: "verify", completed: false }); // structural wake
todos.todos.get(0)!.completed(true); // field write: wakes completed readers only
todos.todos.set(0, { text: "write rules and refs" }); // partial patch, id kept
const plain = todos.$snapshot().todos; // deep-plain for rendering
```

Reference: `packages/store/lib/internal/deep.ts installCollection` and `packages/store/docs/concepts/state.mdx` and `packages/store/tests/collections.test.ts`
