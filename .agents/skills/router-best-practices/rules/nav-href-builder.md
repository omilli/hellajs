---
title: Build anchor hrefs with href(), not template strings
impact: MEDIUM
impactDescription: hand-built hrefs drift from the pattern's param syntax, skip encoding, and duplicate what href() already guarantees
tags: href, anchors, links
---

## Build anchor hrefs with href(), not template strings

`href(path, { params, query })` runs the exact same substitution as `navigate` (shared `buildPath`): `:param` values encode, absent `:param?` tokens strip with their slash, `*` inserts raw, query serializes - and the literal path type-checks the params against the pattern. It returns the URL string without touching history; author plain `<a>` elements with it and let link interception route the clicks. Output is base-free like everything else in the pipeline - `base` is re-added only at history-commit time.

**Incorrect (what is wrong):**

```ts
import { navigate } from "@hellajs/router";

const userId = "42";
// hand-rolled href: no encoding, no compile-time tie to the pattern,
// silently wrong the day the route changes shape
navigate(`/users/${userId}/posts`);
```

**Correct (what is right):**

```ts
import { href } from "@hellajs/router";

const userId = "42";
const profileUrl = href("/users/:id", { params: { id: userId } }); // "/users/42"
const tabUrl = href("/users/:id", { params: { id: userId }, query: { tab: "posts" } });
const optionalUrl = href("/users/:id?", {}); // "/users" - token and slash strip
```

Reference: `packages/router/lib/href.ts` and `packages/router/lib/internal/path.ts buildPath` and `packages/router/docs/api/href.mdx`
