---
title: Use e: with passive false for cancelable gestures and non-bubbling events
impact: HIGH
impactDescription: preventDefault in an on: touch/wheel handler is silently ignored - browsers treat the shared body-level listener as passive, so pull-to-refresh and scroll-blocking gestures break with no error
tags: events, e:, passive, gestures, focus
---

## Use e: with passive false for cancelable gestures and non-bubbling events

`e:` attributes attach a real per-instance listener (bubble phase, error-boundary-wrapped, removed with the element). Use it where delegation cannot work: non-bubbling events (`focus`, `blur` - they never reach the body listener), listeners third-party code expects to find, and cancelable gestures. The gesture case is the silent one: browsers treat body-level `touchstart`/`touchmove`/`wheel` listeners as passive by default, and HellaJS's shared `on:` body listener cannot opt out without degrading scrolling for every app - so `event.preventDefault()` inside an `on:` gesture handler is a no-op. Pass the value as a `{ handler, options }` spec with `passive: false` to cancel, or `once`/`capture` for the other native flags.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const pulled = signal(0);
// Delegated on: - the browser runs the shared body listener passive, so
// preventDefault() is silently ignored and the page scrolls anyway.
const Feed = () => (
  <div on:touchmove={(event) => { event.preventDefault(); pulled(pulled() + 1); }}>
    Pull to refresh
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const pulled = signal(0);
// Direct listener with native options: passive false makes preventDefault work.
const Feed = () => (
  <div
    e:touchmove={{
      handler: (event) => {
        event.preventDefault();
        pulled(pulled() + 1);
      },
      options: { passive: false },
    }}
  >
    Pull to refresh
  </div>
);
```

Non-bubbling events (`e:focus`, `e:blur`) follow the same rule by necessity - delegation never sees them.

Reference: `packages/dom/lib/features/direct-events.ts` and `packages/dom/docs/api/e.mdx`
