---
title: Draft mutators apply structural diffs and are not auto-batched
impact: HIGH
impactDescription: untouched values are never rewritten, but each extracted change is a separate signal write, so un-batched multi-key drafts fire effects repeatedly
tags: draft, extractChanges, batch, structural
---

## Draft mutators apply structural diffs and are not auto-batched

`$update(draft => ...)` clones the snapshot, runs the mutator, then `extractChanges` walks the draft and records only structural differences: arrays, Dates, Maps, Sets, and class instances compare by content, so untouched values are never rewritten and their subscribers sleep. Two contract points. Each extracted change is a separate signal write - wrap multi-key drafts in `batch()` from `@hellajs/core` to flush effects once. And the draft path materializes the full snapshot first, so calling it inside an effect subscribes that effect to every signal in the tree - keep drafts out of narrow effects.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const form = store({ email: "", name: "", touched: false });

// Two separate signal writes: effects over form fire twice
form.$update((draft) => {
  draft.email = "ada@example.com";
  draft.touched = true;
});
```

**Correct (what is right):**

```ts
import { batch } from "@hellajs/core";
import { store } from "@hellajs/store";

const form = store({ email: "", name: "", touched: false });

// One flush: both changes land inside the batch
batch(() => {
  form.$update((draft) => {
    draft.email = "ada@example.com";
    draft.touched = true;
  });
});
```

Reference: `packages/store/lib/internal/draft.ts extractChanges` and `packages/store/tests/draft.test.ts` and `packages/store/docs/api/store.mdx`
