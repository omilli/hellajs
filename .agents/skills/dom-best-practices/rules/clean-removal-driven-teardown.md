---
title: Removal disposes reactivity on the next microtask; unmount is synchronous
impact: MEDIUM
impactDescription: deleting nodes and immediately asserting disposed state fails - the scoped MutationObserver cleans up on a microtask - and skipping teardown in long-lived pages accumulates ghost effects
tags: cleanup, removal, unmount, queues
---

## Removal disposes reactivity on the next microtask; unmount is synchronous

Cleanup is removal-driven: a scoped MutationObserver watches every mount container, and a managed node removed from the DOM (your `el.remove()`, a `replaceChildren`, a list clear) has its effects disposed, handlers removed, and hooks fired on the NEXT microtask - `beforeDestroy`/`afterDestroy` assertions must await a tick after removal. The `MountHandle` from `mount`/`hydrate` short-circuits that: `handle.unmount()` cleans and detaches every root synchronously, and `handle.flush()` drains pending cleanup queues on demand. Content Portal moved into remote targets is covered through the portal's anchor tracking, not the container observer - remove the portal's source region, not the remote nodes. `queueCounts()` is the probe: both counts return to zero after the microtask drain; in tests, `resetDom()` between cases resets observers and queues wholesale.

**Incorrect (what is wrong):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const handle = mount(() => component(App, {}) as TemplateBuildFn, "#app");
document.getElementById("app")?.replaceChildren();
// Asserting disposal NOW fails: the observer has not run its microtask yet.
```

**Correct (what is right):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const App = () => <p>Disposable content</p>;
const handle = mount(() => component(App, {}) as TemplateBuildFn, "#app");

// Synchronous teardown of the whole tree: no microtask wait, no manual walks.
handle.unmount();
```

Reference: `packages/dom/lib/internal/queue.ts processCleanupQueue` and `packages/dom/lib/internal/handle.ts` and `packages/dom/docs/api/mount.mdx`
