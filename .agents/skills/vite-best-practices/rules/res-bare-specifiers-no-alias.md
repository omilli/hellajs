---
title: Import vite-plugin-hellajs and @hellajs/* as bare specifiers, no aliasing
impact: MEDIUM
impactDescription: alias and deep-path imports bypass the package exports maps and drift from published resolution
tags: vite, resolution, alias, exports
---

## Import vite-plugin-hellajs and @hellajs/* as bare specifiers, no aliasing

Install `vite-plugin-hellajs` and the `@hellajs/*` packages as regular dependencies and import them as bare specifiers. The wrapper's compiled output imports `@hellajs/dom/runtime` - a bare specifier Vite resolves through that package's exports map, exactly like any dependency - and the plugin package itself exports only its root (`"."` resolving `index.mjs`/`index.d.ts`); deep paths such as `vite-plugin-hellajs/index.mjs` are outside the contract. No `resolve.alias` and no path mapping `@hellajs/*` to a source checkout: an alias replaces the specifier before dependency resolution, shadowing the installed package with whatever shape the alias target happens to have that day.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import viteHellaJS from "vite-plugin-hellajs/index.mjs"; // deep path, outside exports

export default defineConfig({
  plugins: [viteHellaJS()],
  resolve: {
    alias: {
      // shadows the installed package with a local source checkout
      "@hellajs/dom": fileURLToPath(new URL("../hellajs/packages/dom/lib", import.meta.url)),
    },
  },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// npm install vite-plugin-hellajs @hellajs/core @hellajs/dom
// every specifier resolves bare, through the exports maps
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/package.json` and `plugins/vite/index.mjs viteHellaJS` and `packages/headless/dist/avatar.js`
