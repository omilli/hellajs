---
title: Cascade layers rank below unlayered CSS
impact: HIGH
impactDescription: the layer option wraps rules in @layer, and layered rules lose to unlayered author CSS by construction, so a layered style silently loses to any unlayered rule regardless of specificity
tags: style, layer, cascade, precedence
---

## Cascade layers rank below unlayered CSS

The `layer` option wraps the emitted rules in `@layer {name}` (outermost of `media` when both are set) without touching the class name: the same object with and without a layer derives the same class, only the text differs. That wrapper changes the cascade: layered rules rank below unlayered author CSS at any specificity, and among layers, later-declared names rank above earlier ones. Reach for layers deliberately, to rank resets and framework CSS below your component styles; never expect a layered rule to beat an unlayered one. A removal must mirror the same `layer` option (see the removeStyle rule).

**Incorrect (what is wrong):**

```ts
import { css, style } from "@hellajs/css";

// Unlayered author CSS
css({
  button: {
    padding: "1rem",
  },
});

// Layered rules lose to unlayered CSS by construction: this padding
// silently loses despite the class specificity
const cta = style(
  "cta",
  {
    padding: "0.5rem",
  },
  {
    layer: "components",
  },
);
```

**Correct (what is right):**

```ts
import { css, style } from "@hellajs/css";

// Both sides layered: the later-declared layer ranks above the earlier
css({
  "@layer base": {
    button: {
      padding: "1rem",
    },
  },
});

const cta = style(
  "cta",
  {
    padding: "0.5rem",
  },
  {
    layer: "components",
  },
);
```

Reference: `packages/css/lib/internal/identity.ts scopedRule` and `packages/css/tests/style-layer.test.ts` and `packages/css/docs/api/style.mdx`
