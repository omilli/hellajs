---
title: Return cleanup functions from effects
impact: HIGH
impactDescription: without a returned cleanup every re-run stacks another listener or timer and disposal leaks them all
tags: effect, cleanup, lifecycle
---

## Return cleanup functions from effects

An effect captures a returned function as its cleanup and runs it before every re-execution and on disposal. Any resource acquired inside the body (event listeners, timers, subscriptions, observers) must be released through that return value; non-function returns are ignored. A cleanup may even call the effect's own disposer to stop the re-run entirely.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const mode = signal("touch");
const width = signal(0);
effect(() => {
  const handler = () => width(window.innerWidth);
  window.addEventListener(mode() === "touch" ? "touchstart" : "mousedown", handler);
  // No returned cleanup: every mode change binds another handler, and none
  // is ever removed
});
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const mode = signal("touch");
const width = signal(0);
effect(() => {
  const handler = () => width(window.innerWidth);
  const event = mode() === "touch" ? "touchstart" : "mousedown";
  window.addEventListener(event, handler);
  return () => window.removeEventListener(event, handler); // before each re-run and on dispose
});
```

Reference: `packages/core/lib/effect.ts` and `packages/core/tests/effect-lifecycle.test.ts` and `packages/core/docs/api/effect.mdx`
