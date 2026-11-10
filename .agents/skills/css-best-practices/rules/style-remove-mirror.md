---
title: Mirror style options exactly in removeStyle
impact: HIGH
impactDescription: a removal whose label or options differ from the registration re-derives different text and silently no-ops, leaking the rules; at zero refs the CSSOM rules drop out from under any element still rendered with the class
tags: removeStyle, refcount, removal
---

## Mirror style options exactly in removeStyle

Registration is reference-counted and argument-derived: `removeStyle()` re-derives the class and rule text from the same arguments `style()` used, so identical arguments always locate the entry. Mismatched options (a missing `layer`, a different label form, a missing `host`) derive different text and the removal is a silent no-op: the registration leaks and the rules stay in the sheet. Every `style()` call needs exactly one matching `removeStyle()`; the count reaches zero and the CSSOM rules drop only when the last matching removal runs.

**Incorrect (what is wrong):**

```ts
import { removeStyle, style } from "@hellajs/css";

const card = {
  padding: "1rem",
};

style("card", card, {
  layer: "components",
});

// Missing the layer: derives unlayered text, finds no registration, no-ops
removeStyle("card", card);
```

**Correct (what is right):**

```ts
import { removeStyle, style } from "@hellajs/css";

const card = {
  padding: "1rem",
};

style("card", card, {
  layer: "components",
});

// Same label form, same options: decrements the count, drops at zero
removeStyle("card", card, {
  layer: "components",
});
```

A registration kept for the whole page lifetime (module scope) needs no removal at all; pair registration and removal only for dynamically created styles.

Reference: `packages/css/lib/removeStyle.ts` and `packages/css/lib/internal/injection.ts deregisterText`
