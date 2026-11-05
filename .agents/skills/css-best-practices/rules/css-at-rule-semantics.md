---
title: Conditional at-rules inherit scope, definitional ones stay global
impact: MEDIUM
impactDescription: expecting a definitional at-rule nested under a scoped style to inherit the class silently produces a global rule that styles far more than intended
tags: css, at-rules, media, font-face
---

## Conditional at-rules inherit scope, definitional ones stay global

At-rules split in two. Conditional ones (`@media`, `@container`, `@supports`, `@starting-style`) inherit the active selector: nested under a `style()` class they compose under it, and `&` plus descendant composition work inside them. Definitional ones (`@keyframes`, `@font-face`, `@layer`, `@import`) always process with an empty selector: they never pick up a class scope, even when nested inside a `style()` object. An `@`-prefixed scalar key (`@import: 'url(...)'`) is a block-less statement, emitted ahead of all braced text in the same emission.

**Incorrect (what is wrong):**

```ts
import { style } from "@hellajs/css";

const card = style("card", {
  padding: "1rem",
  // Definitional at-rules never pick up the class: this @font-face
  // registers globally despite sitting under .card-{hash}
  "@font-face": {
    fontFamily: "Inter",
    src: "url('/fonts/inter.woff2')",
  },
});
```

**Correct (what is right):**

```ts
import { css, style } from "@hellajs/css";

// Conditional at-rules inherit the class scope
const card = style("card", {
  padding: "1rem",
  "@media (min-width: 768px)": {
    padding: "1.5rem",
  },
});

// Definitional at-rules belong at the global level
css({
  "@font-face": {
    fontFamily: "Inter",
    src: "url('/fonts/inter.woff2')",
  },
});
```

Reference: `packages/css/lib/css.ts CONDITIONAL_AT_RULES` and `packages/css/docs/api/css.mdx`
