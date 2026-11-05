---
title: WeakMap state access, queue counts, and resetDom between tests
impact: LOW
impactDescription: storing per-element data on DOM nodes themselves fights the WeakMap design, and tests that skip resetDom leak observers and handlers across cases
tags: state, getState, peekState, queueCounts, resetDom
---

## WeakMap state access, queue counts, and resetDom between tests

Per-node state (effects, handlers, hooks, cleanup slots) lives in a WeakMap keyed by the DOM node - never on properties of the node itself. The exported accessors cover the lifecycle: `getState(node)` lazily creates `{ isMounted: false }`, `hasState(node)` checks presence, `peekState(node)` reads without creating, `deleteState(node)` drops the entry (cleanup does this for you - manual deletion skips disposers). For test and introspection work: `queueCounts()` reports the cleanup and mount queue depths - both drain to zero on the next microtask, and a nonzero mount count in an app without hooks means elements are being retained; `resetDom()` tears down all package mutable state (queues, observers, selector registry, delegated listeners, error handlers) and belongs in test teardown so cases stay isolated.

**Incorrect (what is wrong):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

mount(() => component(App, {}) as TemplateBuildFn, "#app");
// State stashed on the node: invisible to cleanup, leaks across tests.
(document.getElementById("app") as Record<string, unknown>)["myState"] = { x: 1 };
```

**Correct (what is right):**

```tsx
import { getState, hasState, peekState, deleteState, queueCounts, resetDom } from "@hellajs/dom";

const node = document.createElement("div");
const state = getState(node); // creates the WeakMap entry
state.isMounted = true;
if (hasState(node)) peekState(node)?.effects?.push(() => void 0);

console.log(String(queueCounts().cleanup)); // drains to 0 on the microtask
deleteState(node); // drop the entry (cleanup normally owns this)
resetDom(); // test teardown: queues, observers, listeners, handlers
```

Reference: `packages/dom/lib/internal/state.ts getState` and `packages/dom/lib/internal/queue.ts queueCounts` and `packages/dom/lib/internal/reset.ts resetDom`
