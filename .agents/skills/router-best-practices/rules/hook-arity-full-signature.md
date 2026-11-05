---
title: Declare the full (params, query) signature
impact: HIGH
impactDescription: a one-argument handler receives params on param routes but the query object on static routes, so the same style means two different things
tags: arity, handlers, hooks, query
---

## Declare the full (params, query) signature

Handler and hook dispatch is arity-based: when the route has params, the function is called `(params, query)`; when params are empty, a two-plus-arg function gets `(undefined, query)` and a one-arg function gets `(query)` - the query as its first and only argument. Declaring `(params, query)` on every handler and route hook is the only style that means the same thing on every route. Under strict null checks, read params and query values as possibly undefined.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/search": (params) => search(params.q), // works - but "params" IS the query
    "/search/:scope": (params) => search(params.q), // broken - params is now the
    // path params object; q lives in the second argument this style never declares
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
    "/search": (params, query) => view(`q=${query.q ?? ""}`), // params is undefined
    "/search/:scope": (params, query) => view(`${params.scope}:${query.q ?? ""}`),
  },
});
```

Reference: `packages/router/lib/internal/hooks.ts executeHook` and `packages/router/lib/internal/matched.ts invokeRouteGuard` and `packages/router/tests/hook-arity.test.ts`
