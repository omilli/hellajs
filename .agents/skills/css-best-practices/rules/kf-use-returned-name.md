---
title: Use the keyframes return value in animation properties
impact: HIGH
impactDescription: the rule registers under a generated kf-hash name, so referencing a hand-assumed name leaves the animation pointing at nothing and it never runs
tags: keyframes, animation, hashing
---

## Use the keyframes return value in animation properties

`keyframes()` registers the `@keyframes` rule under a content-hashed name and returns it: `kf-{hash}`, identical on client and server, collision-free by construction. That returned string is the only correct `animation`/`animation-name` value: hard-coding an assumed name matches no registered rule and the animation silently never runs. Hand-naming `@keyframes` through `css()` works but forfeits the hashed identity and the refcounted `removeKeyframes()` lifecycle.

**Incorrect (what is wrong):**

```ts
import { keyframes, style } from "@hellajs/css";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

// The registered name is "kf-{hash}", not "spin": the animation
// matches nothing and never runs
const spinner = style("spinner", {
  animation: "spin 0.8s linear infinite",
});
```

**Correct (what is right):**

```ts
import { keyframes, style } from "@hellajs/css";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const spinner = style("spinner", {
  width: "2rem",
  height: "2rem",
  animation: `${spin} 0.8s linear infinite`,
});
```

Reference: `packages/css/lib/keyframes.ts` and `packages/css/docs/api/keyframes.mdx`
