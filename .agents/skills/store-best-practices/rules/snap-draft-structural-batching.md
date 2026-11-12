---
title: Draft mutators apply structural diffs and auto-batch their writes
impact: HIGH
impactDescription: untouched values are never rewritten, and the extracted writes coalesce per tick, but the draft path still materializes the full snapshot first
tags: draft, extractChanges, structural
---

## Draft mutators apply structural diffs and auto-batch their writes

`$update(draft => ...)` clones the snapshot, runs the mutator, then `extractChanges` walks the draft and records only structural differences: arrays, Dates, Maps, Sets, and class instances compare by content, so untouched values are never rewritten and their subscribers sleep. Two contract points. Each extracted change is a separate signal write, and core's microtask drain coalesces them: multi-key drafts fire subscribed effects once, with final values (`flush()` forces that drain synchronously). And the draft path materializes the full snapshot first, so calling it inside an effect subscribes that effect to every signal in the tree - keep drafts out of narrow effects.

**Incorrect (what is wrong):**

```ts
import { effect, flush, signal } from "@hellajs/core";
import { store } from "@hellajs/store";

const form = store({ email: "", name: "", touched: false });
const saveCount = signal(0);

effect(() => {
  form.email();
  form.touched();
  saveCount(saveCount() + 1);
});
form.$update((draft) => {
  draft.email = "ada@example.com";
  draft.touched = true;
});
flush();
flush(); // Second drain is a no-op: same-tick writes already coalesced
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const form = store({ email: "", name: "", touched: false });

// Both extracted writes land in one drain: effects fire once with final values
form.$update((draft) => {
  draft.email = "ada@example.com";
  draft.touched = true;
});
```

Reference: `packages/store/lib/internal/draft.ts extractChanges` and `packages/store/tests/draft.test.ts` and `packages/store/docs/api/store.mdx`
