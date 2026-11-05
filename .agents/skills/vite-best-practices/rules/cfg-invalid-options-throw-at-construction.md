---
title: Read a construction-time throw as an options error, never catch past it
impact: MEDIUM
impactDescription: swallowing the throw boots a config whose plugin never registered, and the app fails on untransformed JSX far from the cause
tags: vite, options, validation
---

## Read a construction-time throw as an options error, never catch past it

`viteHellaJS()` validates its options eagerly: the wrapper probes the engine once at construction, so an invalid `target` (or any option the engine rejects) throws while the config loads - before any file transforms. Treat that throw as configuration feedback and fix the option; never wrap the call in try/catch to boot anyway. A caught error means the plugin object never reached `plugins`, and every JSX module then fails later with a syntax error far from the real cause. The same eager probe means a config that loads is a config whose options are valid - no defensive re-validation needed.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

const plugins = [];
try {
  plugins.push(viteHellaJS({ target: "js" }));
} catch {
  // swallowed: no plugin registered, JSX ships untransformed
}

export default defineConfig({ plugins });
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// An invalid option throws at this call, during config load, naming the
// option; a valid config needs no defensive code around it.
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS`
