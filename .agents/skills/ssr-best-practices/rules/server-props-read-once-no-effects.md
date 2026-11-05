---
title: Build server trees from resolved data; props are read once and effects never run
impact: MEDIUM
impactDescription: mutations after the walk change nothing and effects never fire server-side, so render logic that relies on reactive updates silently renders the wrong snapshot
tags: server, snapshot, effects, props, resolve
---

## Build server trees from resolved data; props are read once and effects never run

A server render is one synchronous (or awaited) walk: each reactive child and each function-ref prop is read once at its current value, there is no effect scheduling, no batching, and no re-render when a signal later changes. Mutating a signal after the call returns changes nothing in the produced string - the walk already consumed its snapshot. Resolve server data before building the tree (fetch, then construct the nodes), keep function-ref props at a stable initial value, and leave every reactive subscription - `effect`, watchers, event wiring - to the client build that hydrates the markup.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { ssr } from "@hellajs/ssr";

const count = signal(5);
const body = ssr(<p>Count: {count}</p>);

// The walk already returned: this write changes nothing in the shipped
// string, and no effect would have fired even before it.
count(6);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

interface Stats {
  count: number;
}

// Resolve the data first, then build the tree from it; reactive wiring
// belongs to the client build that hydrates this HTML.
async function render() {
  const stats: Stats = await fetch("/api/stats").then((r) => r.json());
  return ssr(<p>Count: {stats.count}</p>);
}
```

For data that must resolve during render, a Promise-returning getter under `ssr.async` is the supported path - see the member-choice rule.

Reference: `packages/ssr/lib/internal/resolve.ts resolveValue` and `packages/ssr/docs/api/ssr.mdx`
