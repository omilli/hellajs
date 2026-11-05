---
title: Keep frontmatter creator calls statically evaluable - fold at build or fail the build
impact: HIGH
impactDescription: a non-foldable css()/style()/keyframes() argument in page frontmatter fails the build, and vars() in a page throws - the escape hatch is a module plus cssText()
tags: astro, frontmatter, css, folding, styles
---

## Keep frontmatter creator calls statically evaluable - fold at build or fail the build

`css()`, `style()`, and `keyframes()` calls in `.astro` frontmatter fold at build: arguments must be literals, objects, arrays, template literals, same-module `const` bindings, or imported bindings that resolve recursively through their source module (`cx()` compositions and `cva()` recipes fold to their string results). A creator call with non-foldable arguments in the page's frontmatter fails the build with the escape-hatch message - move the dynamic call into a module and collect with `cssText()`. Two positional rules: `vars()` in a page throws outright (its reactivity is dead server-side), while in imported modules non-foldable creator calls are silently ignored because the island runtime owns them. Import theme modules with extensionless relative specifiers (`../styles/tokens`, not `../styles/tokens.ts`): the extractor probes `.mjs`/`.js`/`.ts`/`.tsx`/`.jsx` extensions off the bare base, so a specifier that already carries an extension never resolves and its bindings stay unset.

**Incorrect (what is wrong):**

```astro
---
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";

// computed member access is not statically evaluable: the build fails
// with "frontmatter style() requires statically evaluable arguments"
const hero = style({ color: tokens["foreground"] });
---
<div class={hero}>Hi</div>
```

**Correct (what is right):**

```astro
---
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";

// literals, member chains on imported vars() objects, and const bindings fold
const hero = style({ color: tokens.foreground }, { label: "hero" });
---
<div class={hero}>Hi</div>
```

```ts
// src/styles/tokens.ts - imported bindings fold through their source module
import { vars } from "@hellajs/css";

export const tokens = vars({ foreground: "#111111", background: "#fafafa" });
```

Reference: `plugins/astro/evaluate.mjs extractFrontmatter` and `plugins/astro/tests/frontmatter.test.ts` and `plugins/astro/README.md`
