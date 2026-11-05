---
title: Omit target unless one currency is wanted in every environment
impact: CRITICAL
impactDescription: a pinned dom target starves SSR builds of HellaNode and the server renders nothing
tags: vite, target, ssr, options
---

## Omit target unless one currency is wanted in every environment

Leave `target` unset in app configs. Unset, the wrapper resolves the emission currency per build environment: server builds (an `ssr: true` module request, or a Vite 6+ environment whose consumer is `"server"`) emit `"ast"` - HellaNode objects, `@hellajs/ssr`'s input - and client builds emit `"dom"` - imperative `@hellajs/dom/runtime` construction. An explicit `target` wins verbatim in BOTH pipelines: `{ target: "dom" }` hands the SSR pipeline runtime construction code where the stringifier needs HellaNode; `{ target: "ast" }` ships HellaNode objects to the browser. Pin only to force one currency everywhere deliberately; there is no per-environment override shape - the option is global to the plugin instance.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// SSR app with a pinned client currency: server modules no longer
// emit HellaNode, so @hellajs/ssr has nothing to stringify.
export default defineConfig({
  plugins: [viteHellaJS({ target: "dom" })],
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// server builds resolve "ast", client builds resolve "dom"
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `plugins/vite/README.md` and `examples/ssr-streaming/vite.config.js`
