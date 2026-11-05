---
title: Opt into caching with cacheTime
impact: HIGH
impactDescription: cacheTime defaults to 0 which disables the entire cache phase, so every non-force fetch hits the network and SWR, LRU, and invalidation have nothing to act on
tags: cacheTime, cache, resourceCache.set
---

## Opt into caching with cacheTime

`cacheTime` defaults to `0`, and `0` means no caching at all: the cache lookup phase in `run()` is gated on `cacheTime` being truthy, so without it every non-force `fetch()` falls straight through to dedup or the network. Set `cacheTime` in milliseconds on every resource meant to be cached; entries then live for that TTL from creation. The same rule holds on the manual API: `resourceCache.set(key, data, cacheTime)` requires an explicit `cacheTime` (omission throws, an explicit `0` is a documented no-op).

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()));
await todos.fetch({ force: true });
await todos.fetch(); // cacheTime defaults to 0: a second network request
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {
  cacheTime: 60_000,
});
await todos.fetch({ force: true }); // network
await todos.fetch(); // cache hit within the TTL
```

Reference: `packages/resource/lib/resource.ts` cache phase and `packages/resource/lib/resourceCache.ts set`
