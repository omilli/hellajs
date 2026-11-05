---
title: Pair staleTime with cacheTime for stale-while-revalidate
impact: HIGH
impactDescription: staleTime without a TTL-valid cache entry never fires, and the default Infinity staleTime means cached data is never refreshed without an explicit refetch trigger
tags: staleTime, SWR, revalidateOnStale, cacheTime
---

## Pair staleTime with cacheTime for stale-while-revalidate

SWR needs both knobs: `cacheTime` keeps the entry alive (TTL), `staleTime` marks it fresh inside that window. A fetch that hits a fresh entry returns it with no network. A fetch that hits a stale-but-unexpired entry returns the cached data immediately and, when `revalidateOnStale` is true (default), fires a background force refetch: `isFetching()` true, `isLoading()` false, `data()` keeps serving the previous value until the background fetch lands. Resources default `staleTime` to `Infinity` (never stale - a cache hit never triggers revalidation), while `resourceCache.set` defaults it to `0` (always stale); set `revalidateOnStale: false` to serve stale data without the background refetch.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const user = resource(() => fetch("/api/user").then((r) => r.json()), {
  staleTime: 30_000,
});
await user.fetch({ force: true });
// staleTime with no cacheTime: no entry survives, every fetch() is a network call
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const user = resource(() => fetch("/api/user").then((r) => r.json()), {
  cacheTime: 300_000, // 0-30s fresh: instant cache hits, no network
  staleTime: 30_000, // 30s-5min stale: cached data now + background refetch
});
await user.fetch(); // network
await user.fetch(); // stale window: returns cached data, refetches behind it
```

Reference: `packages/resource/lib/resource.ts` cache phase and `packages/resource/tests/stale.test.ts`
