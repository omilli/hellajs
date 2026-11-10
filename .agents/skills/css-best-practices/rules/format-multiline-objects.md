---
title: Break every styling object across lines and hug its call
impact: LOW
impactDescription: single-line object props bury selectors and variant selections inside dense one-liners, and a dangling call line with the object on its own line stretches one call across two extra lines the reader must rejoin
tags: css, style, cva, vars, keyframes, formatting
---

## Break every styling object across lines and hug its call

Every object literal in styling code breaks across lines, one property per line, at every nesting depth: the `css()` / `style()` / `keyframes()` object and its nested selector blocks, `cva()` configs and their variant maps and selections, `vars()` token objects, and the options bags (`{ label }`, `{ host, scoped }`). Single-property objects are included. The object's opening brace hugs its call: on the call's line for a sole argument (`style({`), on the preceding argument's line otherwise (`style("card", {`, `vars(tokens, {`), with consecutive object arguments joined `}, {` and the closing `}` beside the `)` (`});`). Type literals (`{ title: string }` prop annotations, `type X = { … }` declarations) and comments showing output shapes are not object literals; they stay compact.

**Incorrect (what is wrong):**

```ts
import { cva, style, vars } from "@hellajs/css";

// Variant selections buried in one-liners
const button = cva({ base: { borderRadius: "0.5rem", cursor: "pointer" }, variants: {} });

// Dangling call line; the object floats on its own lines
const card = style(
  "card",
  {
    padding: "1rem",
  },
);

// Options bags collapsed onto one line
const theme = vars({ accent: "#3b82f6" }, { scoped: ".card" });
```

**Correct (what is right):**

```ts
import { cva, style, vars } from "@hellajs/css";

const button = cva({
  base: {
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  variants: {},
});

const card = style("card", {
  padding: "1rem",
});

const theme = vars({
  accent: "#3b82f6",
}, {
  scoped: ".card",
});
```

Reference: `guides/docs.md` and `packages/css/docs/api/cva.mdx`
