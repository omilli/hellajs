---
title: Register the preflight reset through css(), never scoped or hand-copied
impact: HIGH
impactDescription: scoping the reset under a class mangles its selector lists so it silently half-applies, and a mutated copy breaks the removeCss() mirror
tags: css, reset, preflight
---

## Register the preflight reset through css(), never scoped or hand-copied

`reset` is the shipped preflight object (a tailwind preflight port): plain data whose selectors only mean something globally. Register it once at the app entry with `css(reset)`; the call is text-deduped and reference-counted, and `removeCss(reset)` drops exactly that registration. Never pass it to `style()`: scoping composes each top-level selector into a descendant of the generated class (`.cls html, :host`, `.cls *, ::after`), mangling every selector list so the reset half-applies with no error. Never register a mutated copy either: removal re-derives text from the object you pass, so a copy leaves the original registered.

**Incorrect (what is wrong):**

```ts
import { reset, style } from "@hellajs/css";

// Scopes the preflight: every selector list composes against the class,
// so only its first compound gets the prefix and the reset half-applies
const resetClass = style(reset, {
  label: "reset",
});
```

**Correct (what is right):**

```ts
import { css, reset, style } from "@hellajs/css";

// Once, at the app entry: registers globally, deduped and refcounted
css(reset);

const card = style({
  padding: "1rem",
}, {
  label: "card",
});
```

Register the exported reference as-is; if teardown is ever needed, `removeCss(reset)` with the same reference.

Reference: `packages/css/lib/reset.ts reset` and `packages/css/docs/api/reset.mdx`
