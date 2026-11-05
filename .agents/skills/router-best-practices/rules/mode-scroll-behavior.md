---
title: Configure scroll priority once, override per route or navigation
impact: MEDIUM
impactDescription: hand-rolled window.scrollTo calls in handlers fight the router's scroll machine and lose the saved-position restore on back/forward
tags: scroll, scrollBehavior, savedPosition
---

## Configure scroll priority once, override per route or navigation

Scroll resolution follows one priority chain: inline `navigate(path, { scroll })` > route-level `scroll` > global `scrollBehavior`; `false` at any level disables handling; `"auto"` and `"preserve"` skip `scrollTo` entirely. A custom function receives `(to, from, savedPosition)` where `savedPosition` is non-null only on back/forward (null on pushes and replaces) - the standard app shell is `savedPosition ?? { top: 0 }`. String presets ignore it (`"top"` scrolls top even on back). A throw inside a custom fn is caught and logged; navigation is unaffected.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    // manual scrollTo in every handler: no restore-on-back, duplicates the
    // router's own post-commit scroll pass
    "/list": () => {
      renderList();
      window.scrollTo(0, 0);
    },
  },
});
```

**Correct (what is right):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  // restore on back/forward, top otherwise - declared once
  scrollBehavior: (to, from, savedPosition) => savedPosition ?? { top: 0, left: 0 },
  routes: {
    "/list": { handler: () => {}, scroll: "preserve" }, // route override
  },
});
navigate("/chat", { scroll: false }); // per-navigation disable (live updates)
```

Reference: `packages/router/lib/internal/scroll.ts handleScroll` and `packages/router/lib/types.d.ts ScrollBehavior` and `packages/router/tests/scroll.test.ts`
