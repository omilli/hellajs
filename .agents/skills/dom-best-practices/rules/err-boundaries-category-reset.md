---
title: error: configs define boundaries; category alone is not one
impact: HIGH
impactDescription: an element carrying only error:category is skipped by the boundary walk, so errors blow past it to an outer boundary or the console
tags: errors, boundaries, fallback, reset
---

## error: configs define boundaries; category alone is not one

`error:` attributes merge into the element's error config: `error:fallback` (a function returning a flagged build), `error:boundary` (boolean), and `error:category` (a string for filtering). An element becomes a boundary only when its config has `fallback` or `boundary` - when a dispatched error's origin walks up `parentElement`, a `category`-only config is passed over (it still populates `context.config`, so handlers can filter by it, but it never stops or renders anything). A boundary's `fallback` renders in place of the boundary element's content; `context.reset()` - present when the boundary is a compiled template root - re-invokes the stored build for fresh nodes. Nested errors resolve to the NEAREST qualifying boundary.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const region = signal("ok");
// The category-only config is not a boundary: a render error below sails
// through this wrapper to whatever boundary (if any) is above it.
const Shell = () => (
  <div error:category="dashboard">
    <output>{region}</output>
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const region = signal("ok");
const Risky = () => <button>Go</button>;

// A real boundary: the fallback build renders into this element when any
// error below dispatches; the category lets handlers filter what they catch.
const Shell = () => (
  <div
    error:category="dashboard"
    error:boundary={true}
    error:fallback={(error: Error) => <p class="error">{error.message}</p>}
  >
    <Risky />
    <output>{region}</output>
  </div>
);
```

Reference: `packages/dom/lib/features/errors.ts` and `packages/dom/docs/api/error.mdx` and `packages/dom/docs/concepts/error-handling.mdx`
