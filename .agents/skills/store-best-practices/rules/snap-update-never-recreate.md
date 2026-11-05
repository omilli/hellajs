---
title: Change state through $update, never by recreating the store
impact: CRITICAL
impactDescription: a recreated store orphans every subscriber and rendered binding - all keep pointing at dead state while the new copy diverges
tags: update, recreate, orphan, deep merge
---

## Change state through $update, never by recreating the store

`store(initial)` builds a fresh reactive tree; there is no replace-the-whole-state API because the store's properties ARE the signals consumers subscribed to. Reassigning a variable with `store({ ...newState })` strands every prior reader. Mutate in place instead: `$update(partial)` deep-merges plain-object values into nested stores (untouched keys keep their signals and subscribers), or `$update(draft => ...)` applies structural edits. Both paths return the same store object, so the store keeps one identity.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

let settings = store({ theme: "light", fontSize: 12 });

// A new store: every effect, subscription, and rendered binding on the old
// reference now reads dead state
settings = store({ theme: "dark", fontSize: 14 });
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const settings = store({ theme: "light", fontSize: 12 });

// Deep merge: theme's subscribers wake, fontSize's keep sleeping
settings.$update({ theme: "dark" });

// Draft mutator for structural edits, same store identity
settings.$update((draft) => {
  draft.fontSize = 14;
});
```

Reference: `packages/store/lib/internal/create.ts $update` and `packages/store/tests/update.test.ts` and `packages/store/docs/concepts/state.mdx`
