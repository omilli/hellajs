---
title: Consume the vars proxy; the sheet is what updates
impact: HIGH
impactDescription: the returned proxy never mutates and re-calling vars on every change only churns registrations, while the actual update path is the effect writing the sheet when signals change
tags: vars, reactivity, proxy, effects
---

## Consume the vars proxy; the sheet is what updates

`vars()` returns a same-shaped object whose leaves are `var()` reference strings, on both platforms. That result is stable by construction: it is built from the flattened keys alone, so it never mutates when signals change, and a repeat reactive call on the same object returns the very same result while bumping the reference count. Live values reach the stylesheet, not the object: function leaves become one effect per registration that rewrites the declarations when the signals change, so consume the proxy's `var()` strings as static values in `style()`/`css()` objects and let the sheet update in place. Writes inside `batch()` land when the batch flushes. On the server the function leaves resolve exactly once and no effects are created.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { vars } from "@hellajs/css";

const scale = signal(1);
const tokens = vars({ scale: () => scale() });

scale(1.5);

// Wrong instinct: re-register to "refresh". The proxy never held the
// value (it holds "var(--scale)"), and the repeat call only bumps the
// reference count, which now leaks on removal
vars(tokens);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { style, vars } from "@hellajs/css";

const scale = signal(1);
const tokens = vars({ scale: () => scale() });

const box = style("box", {
  transform: `scale(${tokens.scale})`,
});

// The effect rewrites --scale in the sheet; box rules never rebuild
scale(1.5);
```

Reference: `packages/css/lib/vars.ts` and `packages/css/docs/api/vars.mdx`
