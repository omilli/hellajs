---
title: Consume the bundler wrappers for app builds, the engine only for custom pipelines
impact: MEDIUM
impactDescription: re-implementing the wrapper duplicates extension filtering, node_modules skipping, and per-environment target resolution, and the copy drifts
tags: compiler, vite, rollup, astro, wrapper
---

## Consume the bundler wrappers for app builds, the engine only for custom pipelines

If the goal is "compile my app's JSX", the wrappers already own the integration: `vite-plugin-hellajs` filters to js/jsx/ts/tsx, skips node_modules, resolves the target per build environment, and passes JSX-free files through to Vite's native pass; `rollup-plugin-hellajs` does the same for Rollup with jsx/tsx resolution and load handling; `astro-plugin-hellajs` wires the renderer pair (server `ssr`, client `hydrate`). Direct `transform` calls are for pipelines the wrappers do not cover: custom bundlers, codemods, codegen CLIs. Do not fork a wrapper's behavior into your own plugin to chase one option; a missing wrapper option is a feature request, not a reason to hand-roll the host integration.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";
import type { Plugin } from "vite";

// A hand-rolled Vite plugin re-doing vite-plugin-hellajs: hard-coded
// target (broken for SSR), no node_modules skip, no per-env resolution.
export function myHella(): Plugin {
  return {
    name: "my-hella",
    transform(code, id) {
      const result = transform(code, { filename: id, target: "dom" });
      return result ? { code: result.code, map: result.map } : null;
    },
  };
}
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import hellajs from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [hellajs()],
});
```

Reference: `plugins/vite/index.mjs` and `plugins/rollup/index.mjs` and `plugins/astro`
