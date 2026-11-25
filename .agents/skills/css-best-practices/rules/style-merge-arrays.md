---
title: Merge style objects with style([base, override]), not object spreads
impact: MEDIUM
impactDescription: shallow spreads replace nested objects wholesale and rehash the whole object per variant, while the array form deep-merges into one class
tags: style, composition, merge
---

## Merge style objects with style([base, override]), not object spreads

Pass an array of style objects: `style([base, override])` deep-merges left to right into a single class where later entries win, nested plain objects merge recursively, and arrays and scalars replace. Spreading by hand is shallow: a nested selector object (`&:hover`) is replaced wholesale instead of merged, and every variant rehashes the full base object. Variants of one design are `cx(field, modifier)`, not one merge per variant; composing class strings is `cx()`'s job, not string concatenation.

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

// One merged class: later entries win, nested objects merge, arrays replace
const dense = style([base, {
  padding: "0.5rem",
}]);
```

After the array, the second argument is always the options bag (`label`, `layer`, `host`). The array takes style objects only: class strings and other non-objects throw, and so does an empty array. A positional string first argument is a label, never a base.

Reference: `packages/css/lib/style.ts mergeStyles` and `packages/css/docs/concepts/styling.mdx`
