---
title: on: handlers are capture-phase and delegated; this is the element
impact: MEDIUM
impactDescription: expecting target-phase or bubbling semantics misorders handlers, and relying on automatic stopPropagation lets outer handlers fire when they should not
tags: events, delegation, on:, capture
---

## on: handlers are capture-phase and delegated; this is the element

`on:` attributes register on one shared capture-phase listener per event type on `document.body` - no per-element listener is created. Dispatch walks `event.composedPath()` target-first, so the innermost element's handler runs before an outer one's, regardless of capture direction intuition; inside a handler, `this` is the element carrying the handler and `event.target` is the origin. Delegation never auto-stops propagation: every handler on the path fires unless one calls `event.stopPropagation()` (or `stopImmediatePropagation`). Registered event types stay registered for the page lifetime - cleanup removes element handlers, not the shared body listener.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const clicks = signal(0);
// Expects event.target === the button and expects the card's handler NOT to
// fire after the button's: delegation fires both, innermost first, unless a
// handler stops propagation explicitly.
const Card = () => (
  <div on:click={() => void 0}>
    <button on:click={function (this: HTMLElement) { clicks(clicks() + 1); }}>
      Count {clicks}
    </button>
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const clicks = signal(0);
const Card = () => (
  <div on:click={() => void 0}>
    <button
      on:click={function (this: HTMLElement, event: MouseEvent) {
        event.stopPropagation(); // the card's click handler stays quiet
        clicks(clicks() + 1); // this === the button
      }}
    >
      Count {clicks}
    </button>
  </div>
);
```

Reference: `packages/dom/lib/internal/events.ts` and `packages/dom/docs/api/on.mdx` and `packages/dom/docs/concepts/attribute-prefixes.mdx`
