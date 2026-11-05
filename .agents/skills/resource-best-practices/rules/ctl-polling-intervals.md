---
title: Poll with refetchInterval standalone
impact: MEDIUM
impactDescription: gating polling behind refetchOnKeyChange or a hand-rolled setInterval both under- and over-fires - the built-in timer is visibility-aware and cadence-stable
tags: refetchInterval, polling, visibility, dynamic interval
---

## Poll with refetchInterval standalone

`refetchInterval` arms on its own - no `refetchOnKeyChange` needed, and it works with purely manual `fetch()`. It accepts a fixed number of ms, a function `(data) => number | false` re-evaluated after every tick for adaptive cadences (return `false` to stop), or `false`. Ticks skip while `document.visibilityState` is `"hidden"` unless `refetchIntervalInBackground: true`. Key changes never reset the cadence; `reset()` restarts polling at its interval; `abort()` stops it permanently (recreate to resume); `dispose()` clears the timer - call it on unmount for every polling resource.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const stats = resource(() => fetch("/api/stats").then((r) => r.json()), {
  refetchOnKeyChange: true, // added just to make polling "work"
  refetchInterval: 10_000,
});
setInterval(() => stats.fetch({ force: true }), 10_000); // plus a hand-rolled timer
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Health { status: string; }
const health = resource<Health>(() => fetch("/api/health").then((r) => r.json()), {
  // Adaptive: poll fast while unhealthy, slow while fine
  refetchInterval: (data) => (data?.status === "unhealthy" ? 1000 : 30_000),
});
await health.fetch(); // arms without refetchOnKeyChange; skips ticks while hidden
health.dispose(); // stop the timer on unmount
```

Reference: `packages/resource/lib/internal/polling.ts createPolling` and `packages/resource/tests/polling.test.ts`
