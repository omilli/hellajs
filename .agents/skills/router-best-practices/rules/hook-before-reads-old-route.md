---
title: route() is pre-commit inside before hooks
impact: HIGH
impactDescription: analytics and permission checks that read route() in a before hook describe the route being left, not the one arriving
tags: before, route signal, pre-commit, after
---

## route() is pre-commit inside before hooks

Guards run before the `route()` signal is written, so inside a `before` hook or global `hooks.before`, `route()` still holds the route being left - its `path`, `params`, and `meta` are the old route's. The incoming path arrives as an argument (global hooks receive `(to, from)`; `to` carries the query). React to the committed route in `after` hooks or global `hooks.after` - there `route()` already holds the committed match and `from` supplies the prior path without capturing it yourself.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  hooks: {
    before: () => {
      // route().path is the page being LEFT - every page view reports
      // the previous page
      trackPageView(route().path);
    },
  },
  routes: { "/": () => renderHome() },
});
```

**Correct (what is right):**

```ts
import { router } from "@hellajs/router";

router({
  hooks: {
    // after: route() is committed; (to, from) carry both paths, query included
    after: (to, from) => trackPageView(to, from),
  },
  routes: { "/": () => {}, "/editor": () => {} },
});

function trackPageView(_to: string, _from: string) {}
```

Reference: `packages/router/lib/internal/matched.ts runGuardsNested` and `packages/router/lib/internal/matched.ts runGlobalBefore` and `packages/router/tests/hooks.test.ts`
