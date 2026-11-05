---
title: Nest global declarations under a selector or at-rule
impact: MEDIUM
impactDescription: top-level declarations and selector-less conditional at-rule bodies throw loudly, so a first css() call written like a style object fails instead of styling
tags: css, selectors, validation
---

## Nest global declarations under a selector or at-rule

`css()` is selector-first: every top-level key is a CSS selector or an at-rule, never a property. Direct declarations at the top level throw (`[css] top-level declarations have no selector`), and a conditional at-rule body containing direct declarations with no selector in scope throws too (`nest selectors under the at-rule`): both would emit selector-less text the browser silently drops, so the call rejects loudly instead. Wrap declarations in a selector, an at-rule, or use `style()`, which supplies its generated class as the scope.

**Incorrect (what is wrong):**

```ts
import { css } from "@hellajs/css";

// Throws: top-level declarations have no selector
css({
  margin: 0,
  color: "#111827",
});
```

**Correct (what is right):**

```ts
import { css } from "@hellajs/css";

css({
  body: {
    margin: 0,
    fontFamily: "system-ui, sans-serif",
  },
  "*": {
    boxSizing: "border-box",
  },
});
```

The same rejections fire in `removeCss()` on the same object shape: the removal re-runs the identical derivation.

Reference: `packages/css/lib/css.ts process` and `packages/css/docs/api/css.mdx`
