---
title: Embed cssText in every server response
impact: CRITICAL
impactDescription: on the server every creator registers state-only, so a response without a cssText embed ships an unstyled page no matter how many styles the code registered
tags: cssText, ssr, server rendering
---

## Embed cssText in every server response

Every creator (`css()`, `style()`, `keyframes()`, `vars()`) registers on the server without a DOM and returns the same value it returns on the client: the rules exist only as registration state. `cssText()` is the collector that turns that state into the response's `<style>` source: css-side rules in first-registration order (statement-leading texts such as `@import` hoisted ahead of braced-only ones), then the vars contribution. It is a peek, never a drain: repeated calls return the same string until a reset clears the registrations. One embed per response; a page rendered without the embed ships with no styles at all.

**Incorrect (what is wrong):**

```ts
import { css, style } from "@hellajs/css";

css({
  body: {
    margin: 0,
  },
});
const card = style("card", {
  padding: "1rem",
});

// Registrations are state-only on the server: without a cssText()
// embed the page ships with no styles at all
const page = `<!DOCTYPE html><html><head></head><body><div class="${card}"></div></body></html>`;
```

**Correct (what is right):**

```ts
import { css, cssText, style, vars } from "@hellajs/css";

const tokens = vars({
  bg: "#ffffff",
});
css({
  body: {
    margin: 0,
    backgroundColor: tokens.bg,
  },
});
const card = style("card", {
  padding: "1rem",
});

// One embed per response: css side in registration order, then vars
const page = `<!DOCTYPE html><html><head><style id="hella-css">${cssText()}</style></head><body><div class="${card}"></div></body></html>`;
```

Host-qualified registrations are excluded from the collector: their rules live in host sheets (shadow roots), not the document head.

Reference: `packages/css/lib/cssText.ts` and `packages/css/docs/api/csstext.mdx`
