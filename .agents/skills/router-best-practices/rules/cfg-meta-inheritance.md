---
title: Turn on inheritMeta to cascade meta; leaf replaces by default
impact: MEDIUM
impactDescription: parent meta (layouts, roles, titles) silently disappears on nested matches unless the cascade is opted into or a per-route boundary is set
tags: meta, inheritMeta, nested routes
---

## Turn on inheritMeta to cascade meta; leaf replaces by default

By default meta is leaf-only: each nested level's `meta` replaces the parent's, and `route().meta` after a match is the leaf's object. `router({ inheritMeta: true })` merges parent-to-child instead (child wins on key conflict); a per-route `inheritMeta` overrides the global - `true` opts one route into the cascade, `false` marks a boundary that drops everything above it while its own meta still flows down. Inline `navigate(path, { meta })` merges over whatever the chain resolved and wins on conflict.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  // expecting route().meta.layout === "admin" on /admin/users - it is
  // undefined: leaf-only default discards the parent's meta
  routes: {
    "/admin": {
      meta: { layout: "admin", requiresAuth: true },
      children: { "/users": { meta: { title: "Users" }, handler: () => {} } },
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const layout = signal("");

router({
  inheritMeta: true, // parent meta cascades, leaf wins on conflict
  routes: {
    "/admin": {
      meta: { layout: "admin", requiresAuth: true },
      children: {
        "/users": { meta: { title: "Users" }, handler: () => layout("admin") },
        // route-level boundary: opts out of the cascade for this subtree
        "/public": { inheritMeta: false, meta: { title: "Public" }, handler: () => layout("bare") },
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/resolve.ts matchNestedPhase` and `packages/router/lib/types.d.ts RouterConfig` and `packages/router/tests/inherit-meta.test.ts`
