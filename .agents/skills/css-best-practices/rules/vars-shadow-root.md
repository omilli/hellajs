---
title: Pair hosted vars with scoped :host in shadow roots
impact: CRITICAL
impactDescription: a hosted vars registration still defaults to the :root scope, which matches nothing inside a shadow root, so every consumer of those tokens silently styles with no value
tags: vars, shadow dom, host, :host
---

## Pair hosted vars with scoped :host in shadow roots

The `host` option moves the vars sheet into the shadow root, but the scope selector is independent and still defaults to `:root`. Inside a `ShadowRoot`, `:root` matches nothing: the declarations are registered and collected but apply to no element, and every `var()` reference resolves to nothing. Pair `host` with `scoped: ':host'` so the declarations land on the shadow host. The same reference rule as any reactive vars object applies across hosts too: re-registering one object under a different host throws.

**Incorrect (what is wrong):**

```ts
import { vars } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({ mode: "open" });

// :root matches nothing inside a shadow root: the tokens are
// registered but never apply, and consumers get no value
vars(
  {
    accent: "#3b82f6",
  },
  { host: root },
);
```

**Correct (what is right):**

```ts
import { style, vars } from "@hellajs/css";

const root = document.createElement("my-card").attachShadow({ mode: "open" });

const theme = vars(
  {
    accent: "#3b82f6",
  },
  { host: root, scoped: ":host" },
);

const card = style(
  "card",
  {
    color: theme.accent,
  },
  { host: root },
);
```

Reference: `packages/css/lib/internal/vars.ts resolveVarsOptions` and `packages/css/docs/concepts/styling.mdx`
