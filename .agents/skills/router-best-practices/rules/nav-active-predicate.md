---
title: Drive nav highlighting with route().active(), not path equality
impact: MEDIUM
impactDescription: strict path equality leaves parent nav links dead on every subroute, while prefix includes() lights them up on unrelated paths
tags: active, navigation state, links
---

## Drive nav highlighting with route().active(), not path equality

`route().active(pattern)` is the built-in nav-link predicate: ancestor-aware segment matching (query stripped, segment boundaries respected - `/admin` is active at `/admin/users` but not at `/administrators`), reactive (reads `route().path` dynamically), with root `/` exact-only so a home link lights up only at `/`. Strict equality misses subroutes; hand-rolled `startsWith` overshoots.

**Incorrect (what is wrong):**

```ts
import { route } from "@hellajs/router";

// dead highlight on /admin/users; true on /administrators with startsWith
const adminActive = route().path === "/admin";
const adminPrefix = route().path.startsWith("/admin");
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { route } from "@hellajs/router";

effect(() => {
  const adminActive = route().active("/admin"); // true on /admin and /admin/*
  const homeActive = route().active("/"); // exact-only: false everywhere else
  highlight("admin", adminActive);
  highlight("home", homeActive);
});

function highlight(_id: string, _on: boolean) {}
```

Reference: `packages/router/lib/route.ts activeFn` and `packages/router/lib/internal/match.ts matchPattern` and `packages/router/tests/active.test.ts`
