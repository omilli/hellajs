---
title: Resolve server routes with the url option
impact: HIGH
impactDescription: server renders that rely on async guards or window-based resolution hang or resolve "/" instead of the request path
tags: SSR, url, server, synchronous
---

## Resolve server routes with the url option

On the server pass `url: req.url` (a full URL or a bare path - origin and hash are ignored; an invalid URL throws). Resolution is synchronous and `router()` returns the matched `RouteInfo`, so `route()` is already resolved when it returns - no `handler: null` window, no microtask. Async guards never block in this mode (no window): the navigation proceeds and only rejections are logged - gate server access with sync checks and do async data work outside the router or in `resource` with server-side no-op semantics. A second `router({ url })` call in the same process re-resolves against the new URL.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

// server render: async auth gate never blocks here - it logs and proceeds,
// so the private page renders for unauthenticated requests
router({
  routes: {
    "/admin": {
      before: async () => (await loadSession()).valid,
      handler: () => renderAdmin(),
    },
  },
  url: "/admin",
});
```

**Correct (what is right):**

```ts
import { router } from "@hellajs/router";

const initial = router({
  routes: {
    "/admin": {
      before: () => (sessionIsValid() ? true : "/login"), // sync verdicts only
      handler: () => {},
    },
    "/login": () => {},
  },
  url: "/admin?tab=overview", // req.url: resolved synchronously
});
const tab = initial.query.tab ?? ""; // RouteInfo on return - no await

function sessionIsValid(): boolean {
  return true; // resolved from the request's cookie/header before router()
}
```

Reference: `packages/router/lib/router.ts` and `packages/router/lib/internal/matched.ts interpretGuardResult` and `packages/router/tests/ssr.test.ts`
