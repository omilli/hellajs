---
title: Wire mutation success to cache cleanup with invalidates
impact: MEDIUM
impactDescription: invalidates only deletes cache entries, so the screen keeps showing the pre-mutation data until something else fetches again
tags: invalidates, mutate, invalidation, cache
---

## Wire mutation success to cache cleanup with invalidates

`invalidates: Array<string | RegExp>` runs after a successful mutation: strings dispatch to `resourceCache.invalidateByPrefix`, RegExp to `invalidateByPattern`, deleting matched entries so the next fetch for those keys goes to the network. It deletes cache only - mounted resources keep rendering their current data; refresh those explicitly with the resource's `invalidate()` or `resourceCache.invalidateResources`. No invalidation runs on mutation error, abort, or a throwing success-path `onSettled` (settlement did not complete). Matching is string-keys-only like the underlying methods, so object-keyed resources cannot be invalidated this way.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const saveUser = resource(async () => (await fetch("/api/user", { method: "PUT" })).json(), {
  invalidates: ["user:"],
});
await saveUser.mutate({ name: "Ada" });
// Cache entries deleted - but the mounted profile resource keeps showing
// the stale name: nothing refetches it
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const profile = resource(() => fetch("/api/user").then((r) => r.json()), {
  key: () => "user:1",
  cacheTime: 60_000,
});
const saveUser = resource(async () => (await fetch("/api/user", { method: "PUT" })).json(), {
  invalidates: ["user:", /^posts:\d+$/], // cache cleanup on success
});
await saveUser.mutate({ name: "Ada" });
profile.invalidate(); // refresh the mounted view now
```

Reference: `packages/resource/lib/resource.ts mutate` and `packages/resource/tests/invalidates.test.ts`
