---
title: Use resetResource for factory resets, invalidateAll for cache only
impact: MEDIUM
impactDescription: resetResource clears dedup registrations and online subscriptions of every live resource, so calling it mid-app silently degrades unrelated views
tags: resetResource, invalidateAll, logout, HMR, reset
---

## Use resetResource for factory resets, invalidateAll for cache only

`invalidateAll()` clears the cache map and nothing else. `resetResource()` is the full factory reset: cache map, in-flight dedup registrations, online-status callbacks, and the cleanup throttle - the boundary for logout flows in fresh apps, HMR reinitialization, and test setup. It is module-level and global: calling it while other components hold live resources drops their online subscriptions and dedup sharing mid-flight. In app flows where resources stay alive, use targeted invalidation (`invalidateByPrefix`, `invalidateAll`) instead; reserve `resetResource()` for teardown boundaries where nothing survives.

**Incorrect (what is wrong):**

```ts
import { resetResource } from "@hellajs/resource";

function onLogout() {
  // Nukes every live resource's dedup scope and online subscriptions,
  // not just the user's cache entries
  resetResource();
}
```

**Correct (what is right):**

```ts
import { resource, resourceCache, resetResource } from "@hellajs/resource";

// App logout: clear cached user data, live resources keep working
function onLogout() {
  resourceCache.invalidateByPrefix("user:");
}

// Test/HMR boundary: full factory reset (cache, dedup, callbacks, throttle)
resetResource();
const fresh = resource(() => fetch("/api/session").then((r) => r.json()), {});
await fresh.fetch();
```

Reference: `packages/resource/lib/resetResource.ts resetResource` and `packages/resource/tests/reset-resource.test.ts`
