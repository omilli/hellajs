---
title: Pick the right navigate options: replace, scroll, meta
impact: MEDIUM
impactDescription: pushed redirects leave dead history entries the back button walks into, and per-navigation concerns leak into global config when options go unused
tags: navigate, replace, scroll, meta
---

## Pick the right navigate options: replace, scroll, meta

`navigate(path, options)` carries per-navigation concerns so config stays global: `replace: true` swaps the history entry instead of pushing (auth redirects, notFound recovery, post-form landing - back never returns to the dead page); `scroll` overrides route and global scroll for this one navigation (`false` disables); `meta` merges over the resolved route meta and wins on key conflicts (titles, analytics context). `force` (leave-guard skip) and `params`/`query` have their own rules.

**Incorrect (what is wrong):**

```ts
import { navigate } from "@hellajs/router";

// after a successful login, back should not return to /login - but a plain
// push leaves it in history
navigate("/dashboard");
```

**Correct (what is right):**

```ts
import { navigate } from "@hellajs/router";

navigate("/dashboard", {
  replace: true, // overwrites /login in history
  scroll: "top", // this navigation only
  meta: { title: "Dashboard", section: "app" }, // merges over route meta
});
```

Reference: `packages/router/lib/navigate.ts` and `packages/router/lib/internal/resolve.ts go` and `packages/router/tests/navigate-options.test.ts`
