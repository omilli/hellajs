---
title: Async component roots reject through onError, so register it before mounting
impact: HIGH
impactDescription: an async mount rejection has no element context, so no error boundary or fallback renders - without an onError handler it is only console.error, and downstream code assumes a mount that never happened
tags: mount, async, onError, lazy
---

## Async component roots reject through onError, so register it before mounting

`mount` accepts an async component function (`async () => build`) resolving to a flagged build. When that promise rejects, the error routes through `dispatchError` with `phase: "mount"` and no element context - meaning no boundary walk, no fallback UI, only your global `onError` handler (or a bare `console.error`). Register `onError` before issuing the async mount, and render a user-visible fallback from it; do not let loader failures vanish into the console while the rest of the app waits on a tree that never attaches.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// No onError registered: a failed load logs "[dom] <error>" and the app
// silently never mounts.
mount(async () => {
  const mod = await Promise.reject(new Error("chunk failed"));
  return <mod.App />;
}, "#app");
```

**Correct (what is right):**

```tsx
import { mount, onError } from "@hellajs/dom";

const loadApp = (): Promise<{ App: () => JSX.Element }> =>
  Promise.resolve({ App: () => <div id="root">app</div> });
const reportToTelemetry = (error: Error, phase: string): void => void console.info(phase, error);

onError((error, context) => {
  reportToTelemetry(error, context.phase);
  return <p role="alert">Could not load the app. Retry.</p>; // the flagged build
});

mount(async () => {
  const mod = await loadApp(); // rejections land in the handler above
  return <mod.App />;
}, "#app");
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/lib/features/errors.ts onError` and `packages/dom/docs/api/onerror.mdx`
