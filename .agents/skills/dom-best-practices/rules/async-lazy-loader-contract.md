---
title: Lazy loaders take a signal and resolve to a component; errors stay local
impact: HIGH
impactDescription: ignoring the abort signal keeps network work running after the region unmounts, and expecting Lazy failures in onError means the user sees the loading state forever
tags: Lazy, async, cancellation, fallback
---

## Lazy loaders take a signal and resolve to a component; errors stay local

`Lazy` calls `loader({ signal })` once when its region mounts. Forward that AbortSignal into the fetch so a region removed mid-load cancels its network work - the loader's settle callbacks are also guarded internally, but only the signal stops the request. The loader must resolve to a component (a `ComponentFn` or flagged build) - not a promise of a promise, and not a rendered element. On rejection, `fallback` (a flagged build) replaces the region; with no fallback the error logs and whatever is on screen stays. Lazy errors never reach `onError` or error boundaries - the fallback is the whole error story here, unlike `Suspense`.

**Incorrect (what is wrong):**

```tsx
import { Lazy } from "@hellajs/dom";

// Signal ignored: the download keeps running after unmount; no fallback means
// a failed load leaves the loading UI forever (onError never fires for Lazy).
const App = () => (
  <Lazy
    loader={() => fetch("/panel.js").then((res) => res.text() as never)}
    loading={<p>Loading...</p>}
  />
);
```

**Correct (what is right):**

```tsx
import { Lazy } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

const Panel: ComponentFn = () => <section class="panel">Heavy content</section>;

const loadPanel = (options?: { signal?: AbortSignal }): Promise<ComponentFn> =>
  new Promise((resolve) => {
    void options?.signal; // forward to the real fetch: abort stops the work
    setTimeout(() => resolve(Panel), 0);
  });

const App = () => (
  <Lazy
    loader={loadPanel}
    loading={<p>Loading...</p>}
    fallback={<p role="alert">Panel failed to load.</p>}
  />
);
```

Reference: `packages/dom/lib/Lazy.ts Lazy` and `packages/dom/docs/api/lazy.mdx`
