---
title: Reset between tests with resetRouter
impact: LOW
impactDescription: re-initializing with router() alone leaves the leave-guard chain, scroll stack, and in-flight deferrals of the previous test armed
tags: resetRouter, tests, teardown
---

## Reset between tests with resetRouter

`resetRouter()` is the full factory reset: config signals (routes, hooks, redirects, notFound, mode, base, scroll, inheritMeta), the `route()` signal (back to `/`, `pending: false`), the leave-guard chain snapshot, the saved scroll stack, in-flight deferred navigations (abandoned via the epoch bump), and all detached listeners. It never touches `window.location`/`history` - seed the URL separately. Calling `router()` again replaces config but not the leave chain or route state, so test teardown wants both.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

// between tests: config is replaced, but the previous test's leave-guard
// chain is still armed - its leave hooks fire on this test's first navigation
router({
  routes: { "/next": () => renderNext() },
});
```

**Correct (what is right):**

```ts
import { resetRouter, router } from "@hellajs/router";

// teardown: full reset, then fresh init for the next test
resetRouter();
router({
  routes: { "/next": () => {} },
});
```

Reference: `packages/router/lib/resetRouter.ts` and `packages/router/tests/reset-router.test.ts` and `packages/router/tests/helpers.ts setupRouterEnv`
