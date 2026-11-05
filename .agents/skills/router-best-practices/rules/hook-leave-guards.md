---
title: Guard departures with leave; override with force
impact: HIGH
impactDescription: unconditional leave redirects loop into the hop cap and cancel navigation, while dirty-state checks that miss back/forward lose edits silently
tags: leave guards, force, unsaved changes
---

## Guard departures with leave; override with force

Route-level `leave` hooks and the global `hooks.leave` run on every navigation away from a matched route - including browser back/forward (a cancelled pop restores the URL). Order: global leave first, then child-to-parent with the departed route's params. Same-path navigation (query ignored) skips leave entirely; `navigate(path, { force: true })` skips leave guards for that one navigation - the override path for confirmed discards - while incoming `before` guards still run. Return `false` to block, a string to redirect; condition every leave redirect on mutable state, because an unconditional string different from the current path re-enters resolution and dies at the 20-hop redirect cap.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/editor": {
      handler: () => renderEditor(),
      leave: () => "/save", // every departure redirects - including the one
      // away from /save; the loop caps at 20 hops and cancels
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, router } from "@hellajs/router";

const dirty = signal(false);
const view = signal("");

router({
  routes: {
    "/editor": {
      handler: () => view("editor"),
      leave: () => (dirty() ? false : undefined), // block while unsaved
    },
    "/dashboard": () => view("dashboard"),
  },
});

navigate("/dashboard"); // cancelled while dirty: route and URL unchanged
navigate("/dashboard", { force: true }); // after user confirms discard
```

Reference: `packages/router/lib/internal/matched.ts runLeaveGuards` and `packages/router/lib/types.d.ts RouteWithHooks` and `packages/router/tests/leave-guards.test.ts`
