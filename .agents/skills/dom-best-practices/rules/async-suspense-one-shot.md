---
title: Suspense runs its child once; reactive async belongs to resource
impact: HIGH
impactDescription: wrapping a signal-reading async child in Suspense and expecting re-fetch on signal change leaves stale content on screen - the boundary is one-shot by design
tags: Suspense, async, streaming, resource
---

## Suspense runs its child once; reactive async belongs to resource

`<Suspense fallback={...}>` evaluates its child once at mount (or claims the server's resolved stage under hydrate). A thenable child suspends - the fallback renders until settle, then swaps in - but the child never re-runs when a signal it read changes: the boundary is one-shot. For data that refetches on state change, pair `@hellajs/resource` with a reactive child that branches on the resource's getters (`isLoading()`, `data()`), letting the child itself switch between pending and resolved views. Rejections from the suspended child DO bubble - to the nearest `error:` boundary or `onError` - the opposite of `Lazy`, whose errors stay local to its fallback.

**Incorrect (what is wrong):**

```tsx
import { Suspense } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const userId = signal(1);
// The child runs once with userId 1; writing userId(2) never refetches -
// Suspense does not re-suspend on signal changes.
const Profile = () => (
  <Suspense fallback={<p>Loading...</p>}>{() => fetchUser(userId())}</Suspense>
);
```

**Correct (what is right):**

```tsx
import { Suspense } from "@hellajs/dom";

// One-shot async is exactly right here: the child resolves once, the fallback
// shows until settle, and a rejection bubbles to the nearest boundary.
const greeting = new Promise<string>((resolve) => setTimeout(() => resolve("Hi"), 0));

const Banner = () => <Suspense fallback={<p>Loading...</p>}>{() => greeting}</Suspense>;
```

For reactive refetching, see the resource package: a reactive child branching on `isLoading()`/`data()` re-renders on every fetch cycle.

Reference: `packages/dom/lib/Suspense.ts Suspense` and `packages/dom/docs/api/suspense.mdx` and `packages/resource/lib/index.ts`
