---
title: Trust the resolution order: redirects, nested, flat, notFound
impact: HIGH
impactDescription: hand-rolled redirects in guards and handlers run late, re-enter resolution mid-flight, and churn leave guards for moves the pipeline does for free
tags: redirects, notFound, resolution, pipeline
---

## Trust the resolution order: redirects, nested, flat, notFound

Every navigation resolves through one strict pipeline, first hit wins: global `redirects` entries (array order, `from` matched as a pattern, query ignored), then route-map string values (`"/old": "/new"`), then nested routes (specificity-sorted per level), then flat routes (insertion order), then `notFound` (a string replace-redirects; a function receives the attempted path, query included). Express static moves and 404 handling with these knobs; a `before`-hook or handler-time redirect is a second navigation that re-enters the pipeline while the first is still committing.

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  routes: {
    "/old": () => navigate("/"), // handler-time redirect: commits "/old" first,
    "/": () => {},               // then re-enters resolution - leave guards and
    // analytics see two navigations, and "/old" lands in history unless replaced
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("home");

router({
  redirects: [{ from: ["/old", "/legacy"], to: "/" }],
  routes: {
    "/": () => view("home"),
    "/404": () => view("missing"),
  },
  notFound: "/404", // unmatched paths replace-redirect, never a dead entry
});
```

Reference: `packages/router/lib/internal/resolve.ts tryRedirect` and `packages/router/docs/api/router.mdx`
