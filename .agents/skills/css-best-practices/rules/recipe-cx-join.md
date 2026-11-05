---
title: Join class fragments with cx
impact: LOW
impactDescription: hand-rolled joins stringify false and leave stray whitespace, while cx drops falsy fragments and never produces leading or trailing spaces
tags: cx, class names, joining
---

## Join class fragments with cx

`cx()` is the class joiner (clsx parity): strings and numbers contribute themselves, falsy values drop, objects contribute the keys whose values are truthy, and arrays recurse. The result never carries leading or trailing whitespace and is `""` when nothing survives. Hand-rolled `join(" ")` calls stringify `false` fragments (`"card false"`) and leave dangling separators; template concatenation does the same. `cx` is pure: it registers nothing, so it composes freely with `style()` classes and `cva()` output.

**Incorrect (what is wrong):**

```ts
const isActive = false;

// Array join stringifies the false fragment: "card false"
["card", isActive && "card-active"].join(" ");
```

**Correct (what is right):**

```ts
import { cx } from "@hellajs/css";

const isActive = false;

// Falsy fragments drop: "card", never "card false" or "card "
cx("card", isActive && "card-active");
```

Reference: `packages/css/lib/cx.ts` and `packages/css/docs/api/cx.mdx`
