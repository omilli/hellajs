---
title: Pick one style - css or tailwind - and copy every component at it
impact: HIGH
impactDescription: mixing per-call style flags lands two theming systems and mutually dangling imports (tokens without cn, cn without tokens)
tags: style, css, tailwind, variants
---

## Pick one style - css or tailwind - and copy every component at it

Both styles deliver the same component behavior; only the class carrier differs. The css style splices `@hellajs/css` `style()` maps into each copy and keeps a live class array on the element, with `tokens.ts` as its theme artifact. The tailwind style inlines utility strings at the element inside `cn(...)`, with `theme.css` and the shared `cn` helper as its artifacts, and touches no `@hellajs/css` API anywhere. The two flavors' files are not interchangeable: a css copy reads `./tokens.js`, a tailwind copy reads `./cn.js` and utility classes. Set the style once in `hella.ui.json` and let every add inherit it; per-call `--style` flags are the mechanism by which a mixed tree happens.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Per-call style flags: button lands as css (class arrays + tokens),
// dialog lands as tailwind (cn + theme.css) - two theming systems, two
// class carriers, one project.
addComponent(["button"]);
addComponent(["dialog"], { style: "tailwind" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// hella.ui.json: { "style": "css" } - the one-time decision; every add
// inherits it, so the tree carries one carrier and one palette artifact.
addComponent(["button", "dialog", "input"]);
```

Reference: `packages/ui/lib/addComponent.ts addComponent` and `packages/ui/docs/concepts/cli.mdx` and `packages/ui/tests/cli/add.test.ts`
