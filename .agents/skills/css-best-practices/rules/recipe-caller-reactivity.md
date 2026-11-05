---
title: Re-resolve recipes at the call site for reactivity
impact: CRITICAL
impactDescription: variant classes are static once resolved, so computing the class string once freezes the variant for the component's lifetime and signal changes never restyle
tags: cva, reactivity, class binding
---

## Re-resolve recipes at the call site for reactivity

A `cva()` recipe resolves props to a composed class string and nothing more: the classes it returns are static strings, and the recipe carries no subscription to the signals that produced them. Reactivity rides the caller. Bind `class` as a function so each signal change re-runs the resolution: `class={() => button({ size: size() })}`. Resolving the class once outside a reactive binding (or passing a resolved string into a static `class` attribute) pins the variant at its first value. The `class` attribute accepts a function or an array, recalculating when signals change.

**Incorrect (what is wrong):**

```jsx
import { signal } from "@hellajs/core";
import { cva } from "@hellajs/css";

const size = signal<"sm" | "lg">("sm");
const button = cva({
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
  },
});

// Resolved once: the class is frozen at the initial signal value
const cls = button({
  size: size(),
});

<button class={cls}>Save</button>;
```

**Correct (what is right):**

```jsx
import { signal } from "@hellajs/core";
import { cva } from "@hellajs/css";

const size = signal<"sm" | "lg">("sm");
const button = cva({
  variants: {
    size: {
      sm: {
        padding: "0.25rem 0.5rem",
      },
      lg: {
        padding: "0.75rem 1.5rem",
      },
    },
  },
});

// Re-resolved inside a function class binding on every signal change
<button class={() => button({
  size: size(),
})}>Save</button>;
```

Reference: `packages/css/docs/api/cva.mdx` and `packages/css/docs/concepts/styling.mdx`
