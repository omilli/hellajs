---
title: Write cache updates through setData, update, and updateMultiple
impact: MEDIUM
impactDescription: mutating the cached array or object in place changes entry data without touching the resource signal, so nothing re-renders and no reactive update ever fires
tags: setData, update, updateMultiple, cache, reactivity
---

## Write cache updates through setData, update, and updateMultiple

Cached data is served through reactive state: readers re-render because `setData` writes a new value into the raw signal (and the cache entry when `cacheTime > 0`), not because the cached object changed. Never mutate `data()` in place - the reference stays identical, no signal fires, and dependent UI keeps the old render. Use `setData(value)` or `setData((old) => next)` on the owning resource; use `resourceCache.update(key, updater)` / `updateMultiple(updates)` for cross-cutting writes against entries regardless of owning resource (`update` returns false on miss or expiry; both throw on an undefined updater). `resourceCache.map` is the read-only flat view: `map.get` does not refresh `lastAccess`, `resourceCache.get` does - they are different code paths.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {
  key: () => "todos",
  cacheTime: 60_000,
});
await todos.fetch();
// In-place mutation: same reference, no signal fires, nothing re-renders
(todos.data() as string[]).push("new item");
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Todo { id: number; text: string; done: boolean; }
const fetchTodos = async (): Promise<Todo[]> => (await fetch("/api/todos")).json();
const todos = resource(fetchTodos, { key: () => "todos", cacheTime: 60_000 });
await todos.fetch();

// New array identity through setData: the signal fires, the cache entry follows
todos.setData((old) => [...(old ?? []), { id: 4, text: "Ship it", done: false }]);
// Cross-cutting write against the entry itself
resourceCache.updateMultiple<Todo>([
  { key: "todo-3", updater: { id: 3, text: "Renamed", done: true } },
]);
```

Reference: `packages/resource/lib/resource.ts setData` and `packages/resource/tests/resource-cache-update.test.ts`
