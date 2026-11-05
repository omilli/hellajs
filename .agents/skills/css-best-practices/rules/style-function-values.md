---
title: Reactive values belong in vars, never in style objects
impact: MEDIUM
impactDescription: function property values throw at any nesting depth in css() and style() objects; the throw fires at the call, so the component never styles at all
tags: style, vars, reactivity, validation
---

## Reactive values belong in vars, never in style objects

Property values in `css()` and `style()` objects are static by contract. A function value throws (`[css] function values are not supported in css objects`) at any nesting depth: there is no reactive re-derivation of scoped rules. Reactive values belong in `vars()`: author tokens whose leaves are functions (signals, computed), consume the returned `var()` references as static values inside `style()`, and the sheet updates when the signals change without rebuilding any rule. Conditions resolve before the call; for style values that track signals, author tokens with `vars()`.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";

const theme = signal("light");

// Throws: function values are not supported in css objects
const button = style(
  "theme-btn",
  {
    background: () => (theme() === "dark" ? "#374151" : "#3b82f6"),
  },
);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { style, vars } from "@hellajs/css";

const theme = signal("light");

const themeVars = vars({
  background: () => (theme() === "dark" ? "#374151" : "#3b82f6"),
});

const button = style(
  "theme-btn",
  {
    background: themeVars.background,
  },
);
```

Reference: `packages/css/lib/css.ts process` and `packages/css/docs/concepts/styling.mdx`
