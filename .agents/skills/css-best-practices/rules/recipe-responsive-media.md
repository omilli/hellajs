---
title: Declare responsive breakpoints in cva media config
impact: MEDIUM
impactDescription: a responsive selection naming a breakpoint absent from the media config throws at resolution, so the missing declaration surfaces as a render-time failure
tags: cva, responsive, media, breakpoints
---

## Declare responsive breakpoints in cva media config

Responsive selections are pure CSS. A variant prop of `{ initial: 'sm', md: 'lg' }` selects `sm` un-wrapped plus `lg` under the `md` media condition, both classes emitted, no listeners anywhere. The breakpoint key must exist in the recipe's `media` config (a breakpoint name mapped to its media condition); an unknown breakpoint throws at first resolution. Selecting the same value at `initial` and a breakpoint contributes one class while registering both rules. On the server the same resolution emits the same classes and rules, so the critical CSS matches what the client would inject.

**Incorrect (what is wrong):**

```ts
import { cva } from "@hellajs/css";

const layout = cva({
  variants: {
    density: {
      tight: {
        gap: "0.5rem",
      },
      roomy: {
        gap: "1.5rem",
      },
    },
  },
});

// Throws at resolution: "md" is absent from the media config
// (there is none)
layout({
  density: {
    initial: "tight",
    md: "roomy",
  },
});
```

**Correct (what is right):**

```ts
import { cva } from "@hellajs/css";

const MEDIA = {
  md: "(min-width: 768px)",
};

const layout = cva({
  media: MEDIA,
  variants: {
    density: {
      tight: {
        gap: "0.5rem",
      },
      roomy: {
        gap: "1.5rem",
      },
    },
  },
});

// Emits the tight class un-wrapped plus the roomy class under @media
layout({
  density: {
    initial: "tight",
    md: "roomy",
  },
});
```

Reference: `packages/css/lib/cva.ts` and `packages/css/tests/cva-responsive.test.ts`
