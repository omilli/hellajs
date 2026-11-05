---
title: A Promise-returning guard blocks with route().pending
impact: CRITICAL
impactDescription: a fire-and-forget async guard proceeds navigation immediately, so unauthenticated users land on the page while the check is still running
tags: async guards, pending, before, leave
---

## A Promise-returning guard blocks with route().pending

Return the Promise from a `before`/`leave` guard and the client defers the whole commit: `route().pending` flips `true`, the URL holds, and the awaited resolution is interpreted as the verdict (`false` cancels, a string redirects, a rejection cancels and logs). The first async guard owns the verdict - guards after it in the chain do not run - and the handler and `after` hooks fire only after the deferred commit. A newer navigation supersedes an in-flight one; its continuation abandons silently. On the server (`url` mode) a Promise never blocks - resolution proceeds and only rejections log - so gate server renders with sync checks. Render your loading UI from `route().pending`, not a hand-rolled signal.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/admin": {
      // not returned: navigation proceeds NOW, the check races the render,
      // and the late navigate() re-enters resolution
      before: () => {
        checkAuth().then((ok) => {
          if (!ok) navigateToLogin();
        });
      },
      handler: () => renderAdmin(),
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, route, router } from "@hellajs/router";

const view = signal("loading");

router({
  routes: {
    "/admin": {
      // returned Promise: the commit defers until it settles
      before: async () => ((await checkAuth()) ? true : "/login"),
      handler: () => view("admin"),
    },
    "/login": () => view("login"),
  },
});

navigate("/admin");
const inFlight = route().pending; // true until the guard settles - spinner state

async function checkAuth(): Promise<boolean> {
  return true;
}
```

Reference: `packages/router/lib/internal/matched.ts interpretGuardResult` and `packages/router/lib/internal/resolve.ts commitMatch` and `packages/router/tests/async-guards.test.ts`
