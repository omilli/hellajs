---
title: Reconfigure by calling router() again
impact: LOW
impactDescription: manual listener surgery to "swap routes" duplicates handlers the composed cleanup already replaces
tags: reconfiguration, listeners, re-init
---

## Reconfigure by calling router() again

`router()` is re-runnable: it replaces the whole config (routes, hooks, redirects, notFound, mode, base, scrollBehavior, inheritMeta) and re-attaches listeners through a composed cleanup that removes the previous popstate/hashchange and click handlers first - no duplicates, no manual `removeEventListener`. Fresh config deserves a fresh routes object (the entry cache keys on identity) and `resetRouter()` first when route state, the leave chain, or the scroll stack also need clearing.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({ routes: { "/": () => renderHome() } });

// manual listener surgery: the old popstate handler is still attached,
// and the new one now double-fires resolutions
window.addEventListener("popstate", () => window.dispatchEvent(new PopStateEvent("popstate")));
router({ routes: { "/v2": () => renderV2() } });
```

**Correct (what is right):**

```ts
import { resetRouter, router } from "@hellajs/router";

router({ routes: { "/": () => {} } });

// swap config in one call: old listeners detach, new config takes over
router({ routes: { "/v2": () => {} }, mode: "hash" });

// full teardown when route state and guards must not leak:
resetRouter();
```

Reference: `packages/router/lib/router.ts attachListeners` and `packages/router/lib/resetRouter.ts` and `packages/router/tests/reset-router.test.ts`
