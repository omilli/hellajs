---
title: Gate derived array and object results with equality
impact: HIGH
impactDescription: map/filter derivations allocate a fresh reference per recompute, re-running downstream effects even when the derived content is unchanged
tags: computed, equality, performance
---

## Gate derived array and object results with equality

A `computed` whose getter allocates (`map`, `filter`, spread, object literal) produces a new reference on every recompute, and the default reference check sees a change: downstream effects re-run regardless of content. Pass an `equals` comparator to `computed`: an equal recomputed result keeps the old cached reference and stops propagation at that node, so downstream effects skip the run entirely. The comparator is skipped on the first evaluation (previous value is `undefined`).

**Incorrect (what is wrong):**

```ts
import { computed, effect, signal } from "@hellajs/core";

const items = signal([1, 2, 3]);
const doubled = computed(() => items().map((x) => x * 2));
effect(() => {
  console.log(doubled().length);
});
items([1, 2, 3]); // new input reference: map() allocates a fresh array, downstream re-runs
```

**Correct (what is right):**

```ts
import { computed, effect, signal } from "@hellajs/core";

const items = signal([1, 2, 3]);
const doubled = computed(() => items().map((x) => x * 2), {
  equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
});
effect(() => {
  console.log(doubled().length);
});
items([1, 2, 3]); // recomputes to an equal result: propagation stops here
```

Reference: `packages/core/lib/computed.ts` and `packages/core/tests/computed-equality.test.ts` and `packages/core/docs/api/computed.mdx`
