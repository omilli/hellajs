---
title: Nest routes with children; params flow parent to leaf
impact: MEDIUM
impactDescription: hand-parsing route().path to recover parent params duplicates the inheritance the matcher already provides and drifts on pattern changes
tags: nested routes, children, params, crumbs
---

## Nest routes with children; params flow parent to leaf

A route value with `children` matches its own pattern, then tries children against the remaining path; every nested level's hooks and handler receive the cumulative params (parent captures merged with child captures, child wins on name conflicts). A parent with a handler still matches when no child fits; a parent without one does not. Crumbs mirror the chain. Do not re-derive the parent's `:userId` by splitting `route().path` - read it off the merged params.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/users/:userId": {
      children: {
        "/posts/:postId": () => {
          // re-parsing path to recover userId - it is already in params
          const userId = route().path.split("/")[2];
          loadPost(userId, route().path.split("/")[4]);
        },
      },
    },
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
    "/users/:userId": {
      handler: () => view("profile"), // runs when no child matches
      children: {
        "/posts/:postId": ({ userId, postId }) =>
          view(`post ${postId} of ${userId}`), // inherited params
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/match.ts matchNestedEntry` and `packages/router/lib/internal/resolve.ts matchNestedPhase` and `packages/router/docs/concepts/routing.mdx`
