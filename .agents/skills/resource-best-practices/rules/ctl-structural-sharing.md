---
title: Preserve subtree references with structuralSharing
impact: MEDIUM
impactDescription: every fetch produces fresh references by default, so computeds derived from unchanged subtrees re-run on each poll or refetch and re-render work scales with response size
tags: structuralSharing, reactivity, references, computed
---

## Preserve subtree references with structuralSharing

By default a successful fetch writes the fresh result object graph as-is: every array and object is a new reference even when structurally identical, so downstream computeds keyed to any subtree re-evaluate after every refetch. `structuralSharing: true` compares prev and next structurally (arrays and plain objects recursed, `Object.is` for primitives) and reuses the previous references for unchanged subtrees - only changed paths get new containers. `Map`, `Set`, `Date`, and class instances are compared by strict equality and never merged. It applies to the fetch-success path only; `setData` and `mutate` are unaffected. Polling resources feeding fine-grained derivations are the primary beneficiaries.

**Incorrect (what is wrong):**

```ts
import { computed } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const report = resource(() => fetch("/api/report").then((r) => r.json()), {
  refetchInterval: 5000,
});
// Every poll: fresh row references, this computed re-runs even when
// no row changed - and everything reading it re-renders
const rowCount = computed(() => report.data()?.rows.length ?? 0);
```

**Correct (what is right):**

```ts
import { computed } from "@hellajs/core";
import { resource } from "@hellajs/resource";

interface Row { id: number; total: number; }
interface Report { rows: Row[]; generatedAt: string; }

const report = resource<Report>(() => fetch("/api/report").then((r) => r.json()), {
  refetchInterval: 5000,
  structuralSharing: true, // unchanged subtrees keep their references
});
const grandTotal = computed(() => {
  let sum = 0;
  for (const row of report.data()?.rows ?? []) sum += row.total;
  return sum;
});
console.log(grandTotal());
```

Reference: `packages/resource/lib/internal/structural.ts structuralShare` and `packages/resource/tests/structural-sharing.test.ts`
