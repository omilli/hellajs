---
title: Defer offline fetches with pauseWhenOffline
impact: MEDIUM
impactDescription: without the option an offline browser turns every poll tick and key-change refetch into a user-visible error state, when deferral is the correct UX
tags: pauseWhenOffline, offline, isPaused, isOnline, onOnlineChange
---

## Defer offline fetches with pauseWhenOffline

By default an offline browser fails every fetch attempt into `error()`. `pauseWhenOffline: true` defers instead: while offline, `run()` returns before the fetcher is called - no network attempt, no error state, `isPaused()` reads true - and the deferred fetch replays on reconnect with the force flag it was called with. Deferral happens before the cache lookup, so even a TTL-fresh cache hit defers while offline; polling ticks and key-change refetches defer the same way. In-flight requests are not paused (they fail as usual), and mutations never pause. Read browser state with `resourceCache.isOnline()` and subscribe through `resourceCache.onOnlineChange(cb)` (returns its unsubscribe) for connection banners.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const feed = resource(() => fetch("/api/feed").then((r) => r.json()), {
  refetchInterval: 10_000,
});
// Offline: every poll tick fails into error() and flips the UI to an error state
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

const feed = resource(() => fetch("/api/feed").then((r) => r.json()), {
  pauseWhenOffline: true,
  refetchInterval: 10_000,
});
const unsubscribe = resourceCache.onOnlineChange((online) => {
  // Offline ticks defer (isPaused() true); reconnect replays the deferred fetch
  if (!online) console.log("offline - feed deferred:", feed.isPaused());
});
unsubscribe();
```

Reference: `packages/resource/lib/resource.ts run` and `packages/resource/tests/offline-pausing.test.ts`
