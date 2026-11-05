---
title: Compose styles with style(base, override), not object spreads
impact: MEDIUM
impactDescription: shallow spreads replace nested objects wholesale and rehash the whole object per variant, while the compose overload deep-merges into one class
tags: style, composition, merge
---

## Compose styles with style(base, override), not object spreads

Two object arguments compose: `style(base, override)` deep-merges into a single class where the override wins, nested plain objects merge recursively, and arrays and scalars replace. Spreading by hand is shallow: a nested selector object (`&:hover`) is replaced wholesale instead of merged, and every variant rehashes the full base object. Composing class strings is `cx()`'s job, not string concatenation.

**Incorrect (what is wrong):**

```ts
import { style } from "@hellajs/css";

const base = {
  padding: "1rem",
  "&:hover": {
    background: "#f9fafb",
  },
};

// Shallow spread: the nested hover object is dropped, not merged,
// and the dense variant hashes a fresh full-size object
const dense = style({
  ...base,
  padding: "0.5rem",
});
```

**Correct (what is right):**

```ts
import { style } from "@hellajs/css";

const base = {
  padding: "1rem",
  "&:hover": {
    background: "#f9fafb",
  },
};

// One merged class: override wins, nested objects merge, arrays replace
const dense = style(
  base,
  {
    padding: "0.5rem",
  },
);
```

A second plain object reads as an options bag only when every own key is `label`, `layer`, or `host` and no third argument is present; anything else is the override. A positional string first argument is a label, never a base.

Reference: `packages/css/lib/style.ts mergeStyles` and `packages/css/docs/concepts/styling.mdx`
