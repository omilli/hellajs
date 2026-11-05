---
title: Treat route() as one atomic commit
impact: MEDIUM
impactDescription: params stashed outside the reactive scope go stale after the next navigation, mixing fields from two different matches
tags: atomicity, route signal, effects
---

## Treat route() as one atomic commit

Every navigation writes the `route()` signal once - `path`, `params`, `query`, `handler`, `meta`, and `crumbs` always describe the same match, and subscribers fire exactly once per navigation. The documented exceptions are field-preserving spread-writes (the `pending` flip while an async guard holds the commit, and init pre-seeding). So never capture route fields into long-lived variables at setup time; read `route()` inside the effect or computation that consumes it, and branch on fields together rather than caching them apart.

**Incorrect (what is wrong):**

```ts
import { navigate, route } from "@hellajs/router";

// captured once at module scope: still "/list" params after navigating away
const initialParams = route().params;
const targetId = initialParams.id;

navigate("/items/:id", { params: { id: "7" } });
renderItem(targetId); // undefined - stale params from a different match
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { navigate, route } from "@hellajs/router";

effect(() => {
  // inside the effect: one atomic read, always the current committed match
  const { path, params } = route();
  if (path.startsWith("/items")) {
    renderItem(params.id ?? "none");
  }
});

navigate("/items/:id", { params: { id: "7" } });

function renderItem(_id: string) {}
```

Reference: `packages/router/lib/internal/resolve.ts commitMatch` and `packages/router/tests/atomicity.test.ts` and `packages/router/docs/api/route.mdx`
