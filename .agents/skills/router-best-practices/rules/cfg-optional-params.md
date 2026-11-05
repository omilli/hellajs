---
title: Mark optional segments with :param? and read them as possibly absent
impact: MEDIUM
impactDescription: code that assumes an optional param is always present breaks on the skipped form, where the key is absent from params entirely
tags: optional params, patterns, params
---

## Mark optional segments with :param? and read them as possibly absent

A `:param?` segment matches one path segment or is skipped (consume-first backtracking); a skipped optional leaves no key in `params`, so `params.id` is absent, not an empty string. `?` in a pattern always means an optional parameter - patterns never carry query strings. Optionals work mid-pattern (`/posts/:id?/edit`) and combine with wildcards; on the build side an absent optional strips its token together with the preceding slash, so `navigate("/users/:id?")` yields `/users`. Type the value as `string | undefined` and branch on presence.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    // matches both /users and /users/7
    "/users/:id?": (params) => loadUser(params.id), // params.id is undefined on
    // "/users" - and never a path param on this route's query-only visits
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
    "/users/:id?": ({ id }) => view(id ? "detail:" + id : "list"),
  },
});
```

Reference: `packages/router/lib/internal/match.ts matchSegments` and `packages/router/lib/types.d.ts ExtractParams` and `packages/router/tests/optional-params.test.ts`
