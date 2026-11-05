---
title: Suspense fallbacks ship only under ssr.stream
impact: MEDIUM
impactDescription: under ssr and ssr.async the fallback is dropped and children render directly, so a carefully written skeleton never reaches the user
tags: ssr, suspense, fallback, stream
---

## Suspense fallbacks ship only under ssr.stream

`<Suspense>` changes meaning with the member: under `ssr` and `ssr.async` the walk renders the boundary's children directly and drops the fallback (sync has nothing to wait for; async resolves everything before the string returns). Only `ssr.stream` stages the boundary: its `fallback` flushes inline immediately, then each resolved region streams as a `<template>` plus an inline swap script (progressive reveal). Writing a fallback for the sync or async members is dead code, not an error - nothing warns.

**Incorrect (what is wrong):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// Under ssr.async the fallback is dropped: children render directly once
// resolved, so this skeleton never ships and nothing streams early.
const body = await ssr.async(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
);
```

**Correct (what is right):**

```tsx
import { Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

const load = () => fetch("/api/stats").then((r) => r.json());

// Only ssr.stream stages the boundary: the fallback flushes inline now,
// then the resolved region swaps in the moment its Promise settles.
const stream = ssr.stream(
  <main>
    <Suspense fallback={<p>Loading...</p>}>{() => load()}</Suspense>
  </main>,
);
```

Bare Promises outside any boundary are awaited in tree order under `ssr.stream` - a slow one delays everything after it. Wrap the slow subtree in `<Suspense>` to opt it out of in-order delivery.

Reference: `packages/ssr/lib/internal/walk.ts renderDynamicGen` and `packages/ssr/docs/api/ssr.mdx`
