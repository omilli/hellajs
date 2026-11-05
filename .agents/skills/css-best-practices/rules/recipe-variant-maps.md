---
title: Define variants as maps and validate by resolution
impact: MEDIUM
impactDescription: config validation is lazy, so a mistyped variant value sails through creation and throws at first render instead, where it is far harder to trace
tags: cva, variants, validation, laziness
---

## Define variants as maps and validate by resolution

A recipe maps each variant key to value names mapped to style objects (or verbatim class strings, which pass through with no rule generated). Generation is lazy: creating a recipe injects nothing, and each selected value generates its class on first resolution, so unselected variants never produce CSS and the server collects exactly the critical set. Validation is lazy to match: an unknown variant value or unknown breakpoint throws at first resolution, not at `cva()` creation, so a config mistake surfaces at the first call site. `defaultVariants` fills a variant the props omit; `compoundVariants` entries emit when every stated selection equals the resolved one.

**Incorrect (what is wrong):**

```ts
import { cva } from "@hellajs/css";

const button = cva({
  variants: {
    size: {
      sm: { padding: "0.25rem 0.5rem" },
    },
  },
});

// Creation threw nothing; this throws at first resolution:
// unknown value "large" for variant "size". The mistake was in the
// config, but it surfaces here
button({ size: "large" });
```

**Correct (what is right):**

```ts
import { cva } from "@hellajs/css";

const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  variants: {
    size: {
      sm: { padding: "0.25rem 0.5rem" },
      lg: { padding: "0.75rem 1.5rem" },
    },
    tone: {
      primary: { background: "#3b82f6" },
      danger: { background: "#dc2626" },
    },
  },
  defaultVariants: {
    size: "sm",
  },
  compoundVariants: [
    {
      size: "lg",
      tone: "danger",
      css: { fontWeight: 700 },
    },
  ],
});

// Unselected variants generate no CSS; the default fills size
button({ tone: "danger" });
```

Reference: `packages/css/lib/cva.ts` and `packages/css/docs/api/cva.mdx`
