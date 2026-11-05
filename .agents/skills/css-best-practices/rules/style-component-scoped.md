---
title: Scope component styles with style, not global classes
impact: MEDIUM
impactDescription: global hand-written class selectors collide across components and forfeit the scoping, dedup, and removal machinery style() provides
tags: style, scoping, hashing
---

## Scope component styles with style, not global classes

`style()` is the component path: it takes a declarations-first object, derives a content-hashed class (`{label}-{hash}` with a label, a bare letter-only hash without), and scopes every nested selector under it. The hash covers the object alone, so the same object always derives the same class, on every render and on both platforms. Reach for `css()` only for what belongs to no component: resets, element defaults, `@font-face`. Hand-writing a class selector through `css()` for one component's styles leaks that class to the whole document, collides with any other component using the same name, and cannot be removed or refcounted as a unit.

**Incorrect (what is wrong):**

```ts
import { css } from "@hellajs/css";

// Component styles as globals: ".card" collides with every other
// component that styles a class with this name
css({
  ".card": {
    padding: "1rem",
    borderRadius: "0.5rem",
  },
});
```

**Correct (what is right):**

```ts
import { style } from "@hellajs/css";

// Scoped, content-hashed, removable as a unit; "card-{hash}" is
// identical on client and server
const card = style(
  "card",
  {
    padding: "1rem",
    borderRadius: "0.5rem",
    "&:hover": {
      background: "#f9fafb",
    },
  },
);
```

Nested keys compose under the generated class: `&` refers to the class at every occurrence, plain keys become descendants, and conditional at-rules (`@media`, `@container`, `@supports`) inherit it. The options-bag form with a `label` key is equivalent to the positional label.

Reference: `packages/css/lib/style.ts` and `packages/css/lib/internal/identity.ts scopedClassName` and `packages/css/docs/api/style.mdx`
