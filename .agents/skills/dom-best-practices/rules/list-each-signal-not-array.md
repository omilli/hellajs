---
title: Pass the signal to each, not a resolved array
impact: CRITICAL
impactDescription: each={items()} snapshots the array at build time - the list renders once and signal writes never reconcile it again, with no error to notice
tags: ForEach, lists, signals, reactivity
---

## Pass the signal to each, not a resolved array

`ForEach` reconciles by re-running one registered effect whenever the `each` source changes. That only works when `each` receives the reactive source itself - a signal (or a getter function). Passing `each={items()}` calls the signal during the build and hands ForEach a plain array: the effect runs once over the snapshot and has no dependency to re-run on, so adds, removes, and reorders never reach the DOM. The compiler cannot catch this - both forms typecheck. Audit every `each=` for call parentheses; the same snapshots-forever trap applies to any prop surface documented as accepting a signal.

**Incorrect (what is wrong):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const items = signal(["a", "b"]);
// items() snapshots now: pushing "c" later never updates the list.
const List = () => (
  <ul>
    <ForEach each={items()} use={(item: string) => <li>{item}</li>} />
  </ul>
);
```

**Correct (what is right):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const items = signal(["a", "b"]);
// The signal itself: every write reconciles the list in place (keyed, minimal moves).
const List = () => (
  <ul>
    <ForEach each={items} use={(item: string) => <li>{item}</li>} />
  </ul>
);
```

Reference: `packages/dom/lib/ForEach.ts ForEach` and `packages/dom/docs/api/foreach.mdx`
