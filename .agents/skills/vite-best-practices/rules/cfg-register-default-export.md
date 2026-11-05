---
title: Register viteHellaJS() once, in the root plugins array, as a default import
impact: CRITICAL
impactDescription: a misregistered plugin transforms nothing and the dev server serves raw JSX as a syntax error
tags: vite, registration, plugins-array
---

## Register viteHellaJS() once, in the root plugins array, as a default import

Register the factory's default export once, in the root `plugins` array of `vite.config`: `import viteHellaJS from "vite-plugin-hellajs"`. The package's exports map exposes only the root, carrying a single default export (`viteHellaJS(options?)`) - there is no named export to destructure. The plugin sets `enforce: "pre"` itself and runs the same transform hook in the dev server, the client build, and the SSR pipeline, so one registration covers everything: no ordering config, no `apply` guard, no second SSR registration. `build.rollupOptions.plugins` is build-only - a plugin registered there never reaches the dev server, which then serves untransformed JSX.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import { viteHellaJS } from "vite-plugin-hellajs"; // no named export exists

export default defineConfig({
  // build-only placement: the dev server serves untransformed JSX
  build: { rollupOptions: { plugins: [viteHellaJS()] } },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `plugins/vite/package.json` and `examples/counter/vite.config.js`
