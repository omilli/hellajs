---
title: Gate async persistence on the hydrated flag
impact: HIGH
impactDescription: rendering persisted state before an async adaptor settles flashes initial state and can mislead the user
tags: hydration, hydrated, ready, dirty-skip, corrupt state
---

## Gate async persistence on the hydrated flag

Hydration timing depends on the adaptor's read. A plain-value read (localStorage) applies before `persistStore` returns - no flash of initial state. A promise read (IndexedDB, custom adaptors) applies when it resolves: gate rendering on the handle's reactive `hydrated()` flag, or await `ready`, which never rejects. Races self-resolve: if a persisted key changes before the read settles, the in-memory state wins (dirty-skip), and changes to partialized-away keys never trigger the skip. Corrupt stored state self-heals - storage is cleared, the initial state is kept, `onError` fires, and hydration still flips - so a bad stored value never bricks the app. On the server the handle is inert and `hydrated()` is true immediately.

**Incorrect (what is wrong):**

```ts
import { persistStore, store } from "@hellajs/store";
import type { StoreAdaptor } from "@hellajs/store";

const idbAdaptor: StoreAdaptor = {
  read: () => Promise.resolve('{"draft":"persisted"}'),
  write: () => {},
  clear: () => {},
};

const editor = store({ draft: "" });
persistStore(editor, idbAdaptor);

// Async read has not settled: this renders "" and flashes
renderPanel(editor.draft());
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { persistStore, store } from "@hellajs/store";
import type { StoreAdaptor } from "@hellajs/store";

function renderPanel(draft: string) {}

const idbAdaptor: StoreAdaptor = {
  read: () => Promise.resolve('{"draft":"persisted"}'),
  write: () => {},
  clear: () => {},
};

const editor = store({ draft: "" });
const persist = persistStore(editor, idbAdaptor);

effect(() => {
  if (persist.hydrated()) {
    renderPanel(editor.draft()); // persisted state applied
  } else {
    renderPanel(""); // still reading
  }
});
```

Reference: `packages/store/lib/persistStore.ts persistStore` and `packages/store/docs/api/persiststore.mdx` and `packages/store/tests/persist.test.ts`
