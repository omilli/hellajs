---
title: Return verdicts from guards, never navigate() inside them
impact: CRITICAL
impactDescription: a guard that navigates instead of returning a verdict re-enters resolution mid-flight, committing interleaved URL and route writes
tags: guards, before, verdicts, redirect
---

## Return verdicts from guards, never navigate() inside them

`before`/`leave` guards and the global `hooks.before`/`hooks.leave` speak a verdict protocol: return `false` to cancel (no URL, no signal write), a non-empty `string` to redirect there via replace, anything else (`undefined`, `true`) to proceed; a throw cancels and logs. The router interprets the return - so calling `navigate()` inside a guard fights the machinery: the outer navigation is still resolving, the inner call re-enters the pipeline, and URL commits interleave. Return the target path and let the router redirect.

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  routes: {
    "/admin": {
      // void return = "proceed", AND a second navigation starts mid-resolution
      before: () => {
        if (!isAuthed()) navigate("/login");
      },
      handler: () => renderAdmin(),
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const authed = signal(true);
const view = signal("");

router({
  routes: {
    "/admin": {
      before: () => (authed() ? true : "/login"), // string = redirect (replace)
      handler: () => view("admin"),
    },
    "/login": () => view("login"),
  },
});
```

Reference: `packages/router/lib/internal/matched.ts interpretSyncResult` and `packages/router/tests/guards.test.ts` and `packages/router/docs/api/router.mdx`
