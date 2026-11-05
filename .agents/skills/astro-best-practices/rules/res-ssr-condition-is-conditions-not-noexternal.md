---
title: Fix server resolution with the ssr condition the integration already adds - never noExternal or aliases
impact: CRITICAL
impactDescription: ssr.noExternal is a no-op (vite internalizes the packages yet resolves the import arm), aliases fight the exports map, and astro drops user environment conditions - the server build keeps dying at template()
tags: astro, resolution, ssr-condition, noexternal, alias, exports
---

## Fix server resolution with the ssr condition the integration already adds - never noExternal or aliases

JSX-bearing `@hellajs/*` packages ship two dist arms: the `import` arm (dom-target, `template()` builders at module scope) and an `ssr` arm (ast-compiled, safe to import in bare Node). The integration adds the bundler-only `ssr` condition to Astro's `ssr` and `prerender` environments through a vite `configEnvironment` hook, so the server arm resolves zero-config while client environments keep the dom arm and hydration stays interactive. When the server build dies with `document is not defined` from a `template()` call, the missing condition is the mechanism - and the integration already ships the fix. Do not reach for `vite.ssr.noExternal` (Vite internalizes the packages into the server bundle yet still resolves the `import` arm - a no-op), `resolve.alias` to a dist path (fights the package exports map, breaks client resolution, drifts), or user `environments.*.resolve.conditions` (Astro replaces the `prerender` and `client` environment keys wholesale, silently dropping the config).

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";

export default defineConfig({
  integrations: [hellajs()],
  vite: {
    ssr: {
      // no-op: vite internalizes the packages but still resolves the
      // import arm - the server build keeps dying at template()
      noExternal: ["@hellajs/headless"],
    },
  },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";

// the integration's configEnvironment hook already adds the ssr
// condition to the ssr + prerender environments - nothing to configure
export default defineConfig({
  integrations: [hellajs()],
});
```

Reference: `plugins/astro/index.mjs configEnvironment` and `plugins/astro/README.md`
