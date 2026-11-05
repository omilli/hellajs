---
title: Mirror css options exactly in removeCss
impact: HIGH
impactDescription: a removal whose host option differs from the registration decrements nothing and silently leaks the rules into the wrong sheet's registry
tags: removeCss, refcount, removal
---

## Mirror css options exactly in removeCss

`removeCss(obj, options)` re-derives the CSS text from the same arguments the `css()` call used and decrements the matching registration: the same object shape plus the same `host`. Options that differ derive different registration keys, so the removal is a silent no-op. Registration is per-call: two `css()` calls with the same object hold two references, and the rules drop only when the last matching `removeCss()` runs. Unknown inputs are a no-op, never a throw.

**Incorrect (what is wrong):**

```ts
import { css, removeCss } from "@hellajs/css";

const reset = {
  body: {
    margin: 0,
  },
};

const root = document.createElement("my-card").attachShadow({ mode: "open" });

css(reset, { host: root });

// No host: decrements the document-head registration that does not
// exist, and the hosted rules leak
removeCss(reset);
```

**Correct (what is right):**

```ts
import { css, removeCss } from "@hellajs/css";

const reset = {
  body: {
    margin: 0,
  },
};

const root = document.createElement("my-card").attachShadow({ mode: "open" });

css(reset, { host: root });

// Same object, same host: decrements the hosted registration exactly
removeCss(reset, { host: root });
```

Reference: `packages/css/lib/removeCss.ts` and `packages/css/lib/internal/injection.ts deregisterText`
