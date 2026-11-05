---
title: Keep one JSX pipeline - no second JSX plugin beside viteHellaJS()
impact: MEDIUM
impactDescription: a second transform claims the same .tsx files and layers dead dev-mode machinery over already-compiled output
tags: vite, plugin-order, jsx
---

## Keep one JSX pipeline - no second JSX plugin beside viteHellaJS()

`viteHellaJS()` runs with `enforce: "pre"` and claims every `.js`/`.ts`/`.jsx`/`.tsx` app file outside `node_modules`: by the time later plugins see a module, its JSX is already compiled. Do not add `@vitejs/plugin-react`, an esbuild JSX configuration, or any other JSX-transforming plugin to the same config - at best it is dead weight scanning compiled output, at worst two pipelines disagree over who owns `.tsx`. The wrapper needs no ordering help from the config: its `enforce` is set internally, before Vite's own transforms.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  // two JSX pipelines: react() and viteHellaJS() both claim .tsx
  plugins: [react(), viteHellaJS()],
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

Reference: `plugins/vite/index.mjs viteHellaJS` and `plugins/vite/README.md`
