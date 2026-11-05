---
title: Reconfigure routes with a fresh object, never in-place mutation
impact: HIGH
impactDescription: mutating a registered routes map in place is invisible to the matcher, so new routes never match and stale ones never disappear
tags: reconfiguration, route map, cache identity
---

## Reconfigure routes with a fresh object, never in-place mutation

Route maps are cached by object identity: `router()` builds each map's sorted entry lists once and reuses them for every navigation. Mutating the registered object in place (`routes["/new"] = handler`) changes the object but not the cached entries - the router keeps matching the snapshot from registration time. Reconfigure by calling `router()` again with a fresh object; that also re-sorts and re-registers cleanly.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

const appRoutes = {
  "/": () => renderHome(),
};

router({ routes: appRoutes });

appRoutes["/about"] = () => renderAbout(); // invisible: the entry cache still
// holds the registration-time snapshot; "/about" resolves to notFound
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("home");
const appRoutes = {
  "/": () => view("home"),
};

router({ routes: appRoutes });

// reconfigure with a fresh object - new identity, fresh cache entries
router({
  routes: {
    ...appRoutes,
    "/about": () => view("about"),
  },
});
```

Reference: `packages/router/lib/internal/utils.ts getCachedRouteEntries` and `packages/router/lib/router.ts` and `packages/router/tests/routing.test.ts`
