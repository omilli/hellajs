---
title: vars() sheets deliver only through a cssText() flush - extraction discards the registration
impact: HIGH
impactDescription: folded var(--x) references silently render with no value when nothing flushes the vars sheet into the page
tags: astro, vars, csstext, tokens, styles
---

## vars() sheets deliver only through a cssText() flush - extraction discards the registration

An imported `vars()` runs during extraction so its reference object binds and member chains on it fold - `tokens.foreground` becomes `var(--foreground)` in the folded rule - but the sheet registration itself is discarded: static delivery of the `--foreground: #111111` declarations is the layout's `cssText()` flush, and an extracted copy would only duplicate the sheet per importing module. So a page whose folded rules reference vars, with nothing flushing the sheet, silently ships rules whose every `var(--x)` resolves to nothing. Import the vars module (or a theme module that both defines the vars and exports `cssText()`'s result) in the layout or page and inline the flush once. In a page's own frontmatter `vars()` throws outright instead.

**Incorrect (what is wrong):**

```astro
---
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";

// the rule folds (tokens.foreground -> var(--foreground)) but the sheet
// registration is discarded - nothing flushes --foreground into the page
const hero = style({ color: tokens.foreground });
---
<div class={hero}>Hi</div>
```

**Correct (what is right):**

```astro
---
import { styles, tokens } from "../styles/sheet";
import { style } from "@hellajs/css";

const hero = style({ color: tokens.foreground }, { label: "hero" });
---
<head>
  <style is:inline set:html={styles} />
</head>
```

```ts
// src/styles/sheet.ts - the vars sheet and its flush travel together
import { cssText, vars } from "@hellajs/css";

export const tokens = vars({ foreground: "#111111" });
export const styles = cssText();
```

Reference: `plugins/astro/evaluate.mjs extractFrontmatter` and `plugins/astro/tests/frontmatter.test.ts` and `plugins/astro/README.md`
