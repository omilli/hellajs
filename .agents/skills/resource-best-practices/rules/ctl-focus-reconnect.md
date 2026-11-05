---
title: Refetch on focus and reconnect without auto-fetch
impact: LOW
impactDescription: hand-rolled window listeners beside a resource duplicate built-in triggers and miss the dedup that collapses back-to-back focus events
tags: refetchOnWindowFocus, refetchOnReconnect, focus, reconnect
---

## Refetch on focus and reconnect without auto-fetch

`refetchOnWindowFocus` and `refetchOnReconnect` arm standalone listeners - neither needs `refetchOnKeyChange`, so they layer onto manually fetched resources. Focus fires on both `visibilitychange` (tab becomes visible) and the window `focus` event (app switch without hiding the tab); when a tab return fires both back-to-back, deduplication collapses them into one network call. The browser fires `focus` once at page load, so expect one extra fetch on mount. Reconnect subscribes through `resourceCache.onOnlineChange`. Both listeners clear on `abort()`, `reset()`, and `dispose()`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const session = resource(() => fetch("/api/session").then((r) => r.json()), {});
window.addEventListener("focus", () => session.fetch()); // hand-rolled focus refetch
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const session = resource(() => fetch("/api/session").then((r) => r.json()), {
  refetchOnWindowFocus: true, // visibilitychange + focus, deduped
  refetchOnReconnect: true, // online event
});
await session.fetch({ force: true }); // listeners are live with or without this
```

Reference: `packages/resource/lib/internal/lifecycle.ts createFocus` and `packages/resource/tests/focus.test.ts`
