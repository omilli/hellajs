---
title: Opt out of style extraction deliberately - import and reference cssText
impact: MEDIUM
impactDescription: dynamic styles left in page frontmatter either fail the fold or freeze at their build-time value under a prerendered page
tags: astro, csstext, opt-out, dynamic-styles, styles
---

## Opt out of style extraction deliberately - import and reference cssText

A page that imports AND references `cssText` is left byte-identical: extraction skips the whole module and manual management applies. That reference is the escape hatch for dynamic styles - creation moves out of the page into a module (where values can be computed at runtime), the module collects its rules with `cssText()`, and the page inlines the result once in its head. Keep the creation out of page frontmatter even when opted out: a statically prerendered page runs its frontmatter once at build, so a "dynamic" style there freezes at its build-time value. `client:only` islands importing the same theme module register their rules themselves when they load; content-hashed class names match on both sides.

**Incorrect (what is wrong):**

```astro
---
import { cssText, style } from "@hellajs/css";
import { mode } from "../mode";

// dynamic creation left in the page: the cssText reference opts the page
// out of extraction, and the prerendered frontmatter runs once at build -
// the style freezes at whatever mode() returned then
const hero = style({ color: mode() === "dark" ? "#ffffff" : "#111111" });
---
<style is:inline set:html={cssText()} />
```

**Correct (what is right):**

```astro
---
// creation lives in the module; the page only flushes
import { styles } from "../theme";
---
<head>
  <style is:inline set:html={styles} />
</head>
```

```ts
// src/theme.ts - create and collect in a module the page imports
import { cssText, style } from "@hellajs/css";

export const hero = style({ color: "#111111" }, { label: "hero" });
export const styles = cssText();
```

Reference: `plugins/astro/frontmatter.mjs transform` and `plugins/astro/tests/frontmatter.test.ts` and `plugins/astro/README.md`
