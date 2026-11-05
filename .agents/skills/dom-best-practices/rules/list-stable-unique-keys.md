---
title: Give every item a stable, unique key
impact: CRITICAL
impactDescription: without stable unique keys ForEach falls back to array-index keys - a reorder or prepend rebuilds every shifted item, destroying per-item DOM state - and duplicate keys make the last write win, wiring two items to one node
tags: ForEach, keys, reconciliation, reorder
---

## Give every item a stable, unique key

ForEach resolves a key per item in priority order: the `key` extractor prop, the rendered node's `key` prop, the item's own `id` property, and finally the array index. Explicit-class keys (extractor, node `key`, `item.id`) reuse a live node by key identity regardless of item reference; the index fallback additionally requires the same item reference at that position, which a reorder or prepend breaks - every shifted position rebuilds its node and loses whatever per-item DOM state it held (input focus, expansion, uncommitted text). Keys must also be unique across the list: duplicates collide in the key map and the last item silently wins. Pass `key` when items lack a stable `id`, and keep the key stable across edits (the row's database id, never a generated-per-render value).

**Incorrect (what is wrong):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const todos = signal([{ text: "a" }, { text: "b" }]);
// No key, no item.id: index keys. Prepending "new" rebuilds both rows -
// a half-typed inline edit in row 0 is lost.
const List = () => (
  <ul>
    <ForEach each={todos} use={(todo: { text: string }) => <li>{todo.text}</li>} />
  </ul>
);
```

**Correct (what is right):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

type Todo = { id: number; text: string };
const todos = signal<Todo[]>([
  { id: 1, text: "a" },
  { id: 2, text: "b" },
]);
// Stable unique ids: a prepend moves zero nodes' worth of state - each row
// keeps its DOM node (and its inline edit) across any reorder.
const List = () => (
  <ul>
    <ForEach each={todos} key={(todo: Todo) => todo.id} use={(todo: Todo) => <li>{todo.text}</li>} />
  </ul>
);
```

Index keys are acceptable only for append-only lists whose items never reorder or get removed from the middle.

Reference: `packages/dom/lib/ForEach.ts ForEach` and `packages/dom/docs/api/foreach.mdx`
