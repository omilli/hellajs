---
title: Break every styling object across lines, single-property objects included
impact: LOW
impactDescription: single-line object props bury selectors and variant selections inside dense one-liners, so reading a recipe means parsing nested braces and every edit reflows a whole line instead of touching one
tags: css, style, cva, vars, keyframes, formatting
---

## Break every styling object across lines, single-property objects included

Every object literal in styling code breaks across lines, one property per line, at every nesting depth: the `css()` / `style()` / `keyframes()` object and its nested selector blocks, `cva()` configs and their variant maps and selections, `vars()` token objects, and the options bags (`{ label }`, `{ host, scoped }`). Single-property objects are included. When a call takes several arguments and any of them is an object literal, each argument goes on its own line. Type literals (`{ title: string }` prop annotations, `type X = { … }` declarations) and comments showing output shapes are not object literals; they stay compact.

**Incorrect (what is wrong):**

```ts
import { cva, style } from "@hellajs/css";

// Variant selections buried in one-liners; reading means parsing nested braces
const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
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

// Options bags and single-property objects too
const card = style(
  {
    padding: "1rem",
  },
  {
    label: "card",
  },
);
```

**Correct (what is right):**

```ts
import { cva, style } from "@hellajs/css";

const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
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

// One argument per line once any argument is an object literal
const card = style(
  {
    padding: "1rem",
  },
  {
    label: "card",
  },
);
```

**Incorrect (what is wrong):**

```ts
import { vars } from "@hellajs/css";

// Token objects and scoped options collapsed onto one line
const theme = vars(
  {
    colors: {
      primary: "#3b82f6",
    },
  },
  {
    scoped: ".card",
  },
);
```

**Correct (what is right):**

```ts
import { vars } from "@hellajs/css";

const theme = vars(
  {
    colors: {
      primary: "#3b82f6",
    },
  },
  {
    scoped: ".card",
  },
);
```

Reference: `guides/docs.md` and `packages/css/docs/api/cva.mdx`
