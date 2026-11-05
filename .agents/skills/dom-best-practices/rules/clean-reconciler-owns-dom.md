---
title: Never hand-mutate mounted DOM; write signals instead
impact: CRITICAL
impactDescription: manual writes to rendered nodes are overwritten by the next reactive update or missed by cleanup tracking - the reconciler owns that DOM, and it will not negotiate
tags: manual dom, reconciler, signals, anti-pattern
---

## Never hand-mutate mounted DOM; write signals instead

HellaJS does no diffing - every rendered reactive value is owned by an effect that writes it, and every managed node carries state the cleanup system tracks. Grabbing a rendered element and mutating it by hand (`el.textContent = ...`, `el.appendChild(...)`, `el.setAttribute(...)`) fights both owners: the next signal write overwrites your change without warning, and nodes you inserted yourself carry no state, so their effects and handlers leak when the region cleans up. Route every visible change through the reactive system - write the signal, flip the conditional, update the list. The imperative escape hatch over DOM HellaJS did NOT render (or explicitly hands you - `$ref` targets, portal targets) is what `$ref`/`$collection` are for.

**Incorrect (what is wrong):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const count = signal(0);
const App = () => <output>{count}</output>;
mount(() => component(App, {}) as TemplateBuildFn, "#app");

// Hand-write into the reconciler's output: the next count write overwrites
// it, and nothing reactive knows this happened.
(document.querySelector("output") as HTMLElement).textContent = "42";
```

**Correct (what is right):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const count = signal(0);
const App = () => <output>{count}</output>;
mount(() => component(App, {}) as TemplateBuildFn, "#app");

// The same change through the owner: the effect updates the text node.
count(42);
```

Reference: `packages/dom/lib/internal/render.ts` and `packages/dom/lib/internal/cleanup.ts` and `packages/dom/docs/concepts/reactive-refs.mdx`
