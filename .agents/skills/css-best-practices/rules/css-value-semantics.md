---
title: Numbers mean px, so pass other units in strings
impact: LOW
impactDescription: numeric values append px everywhere except a unitless allowlist and custom properties, so a bare number where another unit was meant silently styles the wrong geometry
tags: css, values, units
---

## Numbers mean px, so pass other units in strings

Value semantics in `css()` and `style()` objects are fixed. Numbers append `px` unless the property is in the unitless allowlist (`z-index`, `opacity`, `flex`, `line-height`, `order`, `font-weight`, and friends) or the key is a `--` custom property. Strings pass through verbatim: pass `"50%"`, `"1rem"`, `"0.8s"` with their units. Array values join with commas (multi-value properties), `content` strings auto-quote unless already quoted, `null` and `undefined` values are skipped, camelCase keys kebab-case, and `--` custom-property keys stay verbatim.

**Incorrect (what is wrong):**

```ts
import { css } from "@hellajs/css";

// Numbers mean px: both become px lengths, not percentages
css({
  ".pin": {
    top: 50,
    left: 50,
  },
});
```

**Correct (what is right):**

```ts
import { css } from "@hellajs/css";

css({
  ".pin": {
    top: "50%",  // strings carry their own units
    zIndex: 100,  // unitless allowlist stays raw
    gap: 4,  // numbers append px
    transition: ["opacity 0.2s ease", "transform 0.2s ease"],  // arrays join with commas
    content: "open",  // content strings auto-quote
  },
});
```

Reference: `packages/css/lib/css.ts UNITLESS_PROPERTIES` and `packages/css/docs/api/css.mdx`
