---
title: resourceCache.set writes a separate public scope
impact: MEDIUM
impactDescription: manual entries coexist with resource entries of the same key instead of seeding them, so a seeded resource silently refetches
tags: resourceCache, set, public scope, seeding
---

## resourceCache.set writes a separate public scope

The cache is two-level: `Map<scope, Map<key, entry>>`, where a resource's scope is its fetcher reference. `resourceCache.set` writes to a dedicated public scope instead, so a manual entry and a resource entry with the same key are two separate entries that coexist; cross-scope reads like `resourceCache.get` return the first TTL-valid hit, but a resource's own fetch path only ever looks in its fetcher's scope. To warm a resource's cache, use `resourceCache.prefetch` with the same fetcher reference (or pass `initialData`); `resourceCache.set` never seeds a resource scope.

**Incorrect (what is wrong):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

// Manual entry in the public scope...
resourceCache.set("todos", [{ id: 1, text: "Seed" }], 60_000);

// ...never seeds this resource's fetcher scope: fetch() still hits the network
const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {
  key: () => "todos",
  cacheTime: 60_000,
});
await todos.fetch();
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Todo { id: number; text: string; }
const fetchTodos = async (): Promise<Todo[]> => (await fetch("/api/todos")).json();

// Same fetcher reference: prefetch writes into the scope the resource reads
await resourceCache.prefetch({ fetcher: fetchTodos, key: "todos", cacheTime: 60_000 });
const todos = resource(fetchTodos, { key: () => "todos", cacheTime: 60_000 });
await todos.fetch(); // cache hit - no network
```

Reference: `packages/resource/lib/resourceCache.ts PUBLIC_SCOPE` and `packages/resource/tests/collision.test.ts`
