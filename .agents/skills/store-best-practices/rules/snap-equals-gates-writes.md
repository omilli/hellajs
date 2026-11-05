---
title: Gate equal writes with per-key equals comparators
impact: MEDIUM
impactDescription: identity-defaulted class-instance writes wake every subscriber even when nothing changed by content
tags: equals, comparator, structural, write gating
---

## Gate equal writes with per-key equals comparators

Pass `equals` at creation to skip no-op writes: a comparator returning `true` drops the write entirely - the signal keeps its value and no subscriber wakes - and `"structural"` compares content (Dates by time, NaN by SameValueZero, arrays element-wise). Comparators apply on every write path - direct calls, `$update(partial)`, and drafts - and run after middleware, so they see transformed values. Object keys take a nested equals map that threads into the nested store's own keys (anything else throws at create time); Array/Map/Set keys take a per-element comparator: it receives two elements (two values for a Map), never two collections.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const log = store({ at: new Date(2026, 0, 1) });

// Same instant, different instance: the identity default wakes every reader
log.at(new Date(2026, 0, 1));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const log = store(
  { at: new Date(2026, 0, 1) },
  { equals: { at: "structural" } },
);

// Content-equal: the write is skipped, no subscriber wakes
log.at(new Date(2026, 0, 1));
```

Reference: `packages/store/lib/types.d.ts StoreEquals` and `packages/store/tests/equals.test.ts` and `packages/store/docs/api/store.mdx`
