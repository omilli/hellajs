---
title: Host web component styles with the host option
impact: HIGH
impactDescription: styles registered without a host land in document.head and escape shadow-root encapsulation, leaking into and missing the component tree they were written for
tags: style, host, shadow dom, web components
---

## Host web component styles with the host option

The `host` option redirects the generated `<style>` elements into any parent node, most commonly a shadow root: one `<style>` per sheet id inside the host, never `document.head`. Registries are host-qualified, so the same styles injected into two hosts never dedup into one sheet: N web component instances style independently with separate reference counts. Removers (`removeStyle`, `removeCss`, `removeVars`) take the same `host` option to reach the same sheet. Hosted `vars()` has one sharp edge: the default `:root` scope matches nothing inside a shadow root (see the vars shadow-root rule).

**Incorrect (what is wrong):**

```ts
import { style } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

// No host: the rules land in document.head, outside the shadow root,
// and the component's inner tree never sees them under encapsulation
const card = style("card", {
  color: "#111827",
});
```

**Correct (what is right):**

```ts
import { css, style } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({
  mode: "open",
});

// Sheets are created inside the host, not document.head
const card = style("card", {
  color: "#111827",
}, {
  host: root,
});

css({
  "*": {
    boxSizing: "border-box",
  },
}, {
  host: root,
});
```

Reference: `packages/css/lib/internal/sheet.ts getSheet` and `packages/css/tests/style-host.test.ts` and `packages/css/docs/concepts/styling.mdx`
