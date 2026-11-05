---
title: Head collection is post-hoc under ssr.stream
impact: MEDIUM
impactDescription: a streamed document emits its head up front, so entries the walk collects later - title included - never join it and the page ships without them
tags: collect, head, stream, post-hoc
---

## Head collection is post-hoc under ssr.stream

The `{ head }` bag fills as the walk proceeds on every member, but a streamed document emits its `<head>` prefix before any body chunk: whatever the walk collects later (including staged `<Suspense>` swaps that keep filling the bag) arrives after the head is already on the wire. Under streaming the bag is post-hoc inspection only. Declare the head entries on `doc` explicitly - either statically, or by running one non-streaming pass (`ssr`/`ssr.async`) with `{ head }` over the same tree first and handing the filled bag to `doc`. Note the second walk re-reads every getter: use it only when the tree genuinely owns its head entries and the getters are cheap or pure.

**Incorrect (what is wrong):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const Page = () => (
  <main>
    <title>Dashboard</title>
    <h1>Dashboard</h1>
  </main>
);

// The streamed document's <head> flushes before the walk reaches the
// <title>: the collected entry never joins it and the page ships untitled.
const head = ssr.head();
const page = doc({ body: ssr.stream(Page(), { head }), head });
```

**Correct (what is right):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

const Page = () => (
  <main>
    <title>Dashboard</title>
    <h1>Dashboard</h1>
  </main>
);

// One non-streaming pass fills the bag first; doc then emits the collected
// head up front and the streamed body follows.
const head = ssr.head();
await ssr.async(Page(), { head });
const page = doc({ body: ssr.stream(Page()), head });
```

Reference: `packages/ssr/lib/types.d.ts StreamOptions` and `packages/ssr/docs/api/ssr.mdx`
