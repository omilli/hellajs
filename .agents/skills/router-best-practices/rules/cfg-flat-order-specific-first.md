---
title: Order flat routes specific-first; only nested routes are sorted
impact: HIGH
impactDescription: a generic flat pattern listed first permanently shadows every specific one after it, so the wrong handler runs and the bug is invisible until the route is hit
tags: specificity, ordering, flat routes, nested routes
---

## Order flat routes specific-first; only nested routes are sorted

Nested route maps are sorted by specificity at every level (non-wildcard before wildcard, deeper before shallow), but flat entries match in plain object insertion order and the first hit wins. List literal and deeper patterns before param and wildcard patterns at the same level, or model the family as nested `children` and let the sort do it.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/users/:id": () => renderUser(), // matches "/users/new" first - the generic
    "/users/new": () => renderCreate(), // pattern shadows it: never reached
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/users/new": () => view("create"), // specific first
    "/users/:id": () => view("detail"),
    // or nest under "/users" - children are specificity-sorted for you
    "/files": {
      handler: () => view("browser"),
      children: {
        "/:id?": () => view("file"),
        "/*": () => view("folder"),
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/utils.ts sortRoutesBySpecificity` and `packages/router/lib/internal/resolve.ts matchFlatPhase` and `packages/router/tests/specificity.test.ts`
