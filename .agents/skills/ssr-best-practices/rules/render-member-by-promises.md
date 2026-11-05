---
title: Pick the ssr member by the tree's Promise shape
impact: HIGH
impactDescription: a Promise the sync walk cannot await stringifies to [object Promise] in the shipped HTML, with only a console warn to surface it
tags: ssr, async, stream, promise, member
---

## Pick the ssr member by the tree's Promise shape

One namespace, three timing strategies: the base `ssr(node)` walks synchronously; `ssr.async(node)` awaits every Promise a resolved value returns (a reactive child, a function-ref prop, `ForEach`'s `each`, `Transition`'s `show`, `Lazy`'s loader) and resolves to the full string; `ssr.stream(node)` flushes chunks progressively. The sync walk cannot await: each thenable it meets emits one console warn and degrades in place (a Promise child or prop stringifies to `[object Promise]`, a Promise `each` renders an empty region, a Promise `show` is truthy so children still emit). All three emit byte-identical markers, so `hydrate` consumes any output unchanged; choose by data shape, never by output fear.

**Incorrect (what is wrong):**

```tsx
import { ssr } from "@hellajs/ssr";

const user = () => fetch("/api/users/1").then((r) => r.text());

// Sync walk: the getter's Promise stringifies into the shipped region as
// "[object Promise]" (one console warn per occurrence, still wrong HTML).
const body = ssr(<p>Hello {user}</p>);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

const user = () => fetch("/api/users/1").then((r) => r.text());

// ssr.async awaits the thenable, then classifies the resolved value exactly
// as the sync walk would - same markers, hydrate consumes it unchanged.
const body = await ssr.async(<p>Hello {user}</p>);
```

When every value is already resolved, keep the sync call: it carries zero Promise overhead and cannot warn.

Reference: `packages/ssr/lib/internal/resolve.ts SYNC_PROMISE_WARN` and `packages/ssr/tests/ssr.test.tsx`
