---
title: Keep patterns base-free; set base once in router config
impact: HIGH
impactDescription: manually prefixing paths double-applies the base on every history commit, landing users on /app/app/... routes that resolve to notFound
tags: base path, subpath, history mode
---

## Keep patterns base-free; set base once in router config

`base: "/app"` is strip-on-read, re-add-on-commit: the router strips it from every URL it reads (initial location, popstate, intercepted clicks, the `url` option) and prefixes it on every history write. Everything inside the pipeline - patterns, `navigate()` targets, `href()` output, `route().path`, `active()`, crumbs - stays logical and base-free. The base must be a `"/"`-prefixed string (else `router()` throws); trailing slashes normalize away; hash mode ignores it entirely (the pathname is never touched).

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  base: "/app",
  routes: { "/app/dashboard": () => renderDash() }, // pattern carries the base:
});
// the URL /app/app/dashboard is what matches; real /app/dashboard never does
navigate("/app/settings"); // commits /app/app/settings
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, router } from "@hellajs/router";

const view = signal("");

router({
  base: "/app", // served from https://example.com/app/
  routes: { "/dashboard": () => view("dash") },
});
navigate("/settings"); // commits /app/settings; route().path === "/settings"
```

Reference: `packages/router/lib/router.ts` and `packages/router/lib/internal/utils.ts stripBase` and `packages/router/tests/base-path.test.ts`
