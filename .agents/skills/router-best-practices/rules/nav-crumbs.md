---
title: Render breadcrumbs from route().crumbs, not path splitting
impact: LOW
impactDescription: path splitting guesses at nesting the router already records, and breaks the moment a pattern gains an optional or wildcard segment
tags: crumbs, breadcrumbs, nested routes
---

## Render breadcrumbs from route().crumbs, not path splitting

Every matched navigation writes `route().crumbs`: a frozen parent-to-leaf chain, one `Crumb` per nesting level - `segment` is the route-map key that matched at that level, `path` the cumulative matched URL with query excluded (safe for `href`), `params` the params inherited through that level. Flat matches carry a single crumb; a `notFound` resolution carries an empty array. Deriving breadcrumbs by splitting `route().path` re-implements the matcher badly.

**Incorrect (what is wrong):**

```ts
import { route } from "@hellajs/router";

// guesses one crumb per raw path segment: wrong for /users/:id? (0 or 1
// segments), wildcards, and any pattern whose depth differs from the URL's
const crumbs = route().path.split("/").filter(Boolean);
```

**Correct (what is right):**

```ts
import { href, route } from "@hellajs/router";

const labels: Record<string, string> = { "/users": "Users", "/users/:userId": "Profile" };

const trail = route().crumbs.map((crumb) => ({
  label: labels[crumb.segment] ?? crumb.segment, // map key -> label
  url: crumb.path, // cumulative URL, query excluded - safe for href()
}));
const deepLink = href("/users/:userId", { params: { userId: route().params.userId ?? "0" } });
```

Reference: `packages/router/lib/internal/resolve.ts matchNestedPhase` and `packages/router/lib/types.d.ts Crumb` and `packages/router/tests/crumbs.test.ts`
