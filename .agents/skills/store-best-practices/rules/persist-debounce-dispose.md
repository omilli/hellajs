---
title: Debounce write bursts and dispose persistence handles
impact: MEDIUM
impactDescription: an undisposed persistence effect outlives its owner and keeps writing to storage; un-debounced bursts write per keystroke
tags: debounce, dispose, pagehide, teardown
---

## Debounce write bursts and dispose persistence handles

By default every post-hydration change writes to storage immediately. `debounce` (milliseconds) coalesces bursts into one write per window carrying the final state, with a `pagehide` flush so the tail is not lost. The handle's `dispose()` stops write-through permanently: it kills the persistence effect, cancels a pending debounced write, and removes the pagehide listener. Keep the handle and call `dispose()` when the persisted store's owner tears down (SPA route unmount, test end); dropping the handle leaves the effect writing for the rest of the session. Dispose is idempotent, and disposing before an async read settles abandons hydration with the store keeping its current state.

**Incorrect (what is wrong):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const draft = store({ text: "" });

// Handle dropped: the effect writes on every debounce window for the rest
// of the session and can never be stopped
persistStore(draft, localStorageAdaptor("draft"), { debounce: 200 });
```

**Correct (what is right):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const draft = store({ text: "" });
const persist = persistStore(draft, localStorageAdaptor("draft"), {
  debounce: 200, // one write per 200ms window, flushed on pagehide
});

function teardown() {
  persist.dispose(); // stops write-through, cancels pending writes
}
```

Reference: `packages/store/lib/persistStore.ts persistStore` and `packages/store/docs/api/persiststore.mdx` and `packages/store/tests/persist.test.ts`
