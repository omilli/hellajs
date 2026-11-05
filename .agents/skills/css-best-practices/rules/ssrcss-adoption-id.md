---
title: Ship the style tag with its sheet id
impact: HIGH
impactDescription: an id-less style embed forces hydration to create a second element and duplicate every delivered rule, doubling the sheet the page carries
tags: cssText, hydration, adoption, sheet id
---

## Ship the style tag with its sheet id

Deliver the collected CSS inside a `<style>` element carrying the `hella-css` id (and `hella-vars` for the vars half). On hydration the client finds the element by id and adopts it: every re-registration whose text byte-equals a delivered rule claims that rule in place, in the same element, with no duplicate insertion and no flash window. Without the id the client cannot find the delivery: it creates its own element and re-registers every rule, so the page carries the same rules twice (identical and harmless, but doubled).

**Incorrect (what is wrong):**

```ts
import { css, cssText } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});

// No id: hydration inserts a second element and duplicates every rule
const head = `<style>${cssText()}</style>`;
```

**Correct (what is right):**

```ts
import { css, cssText, vars } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
vars({
  bg: "#ffffff",
});

// Two-tag delivery: each half embeds into the tag carrying its sheet id
const cssTag = `<style id="hella-css">${cssText.css()}</style>`;
const varsTag = `<style id="hella-vars">${cssText.vars()}</style>`;
```

A single `<style id="hella-css">${cssText()}</style>` embed carries both halves in one tag; the split members exist for two-tag delivery where each sheet keeps its own element.

Reference: `packages/css/lib/internal/sheet.ts adoptElementRules` and `packages/css/docs/concepts/styling.mdx`
