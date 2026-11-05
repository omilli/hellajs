---
title: Engine questions are compiler-best-practices ground; the wrapper only wires them
impact: LOW
impactDescription: reasoning about transform internals from the Vite config leads to re-implementing behavior the wrapper already forwards
tags: vite, compiler, boundaries
---

## Engine questions are compiler-best-practices ground; the wrapper only wires them

The wrapper forwards to `hellajs-compiler` and owns no transform semantics: the `{ code, map }` it returns to Vite carries the engine's already-chained sourcemap, and a `null` return (a JSX-free file) hands the module to Vite's native esbuild pass - which is what strips TS types; the pipeline never typechecks. Questions about output shape, sourcemap chaining, `lang` resolution for virtual ids, or the null contract belong to `compiler-best-practices`; this skill covers host wiring only. Same split for other hosts: Rollup builds route to `rollup-best-practices`, the Astro renderer to `astro-best-practices`. Do not re-implement the wrapper's filter/target/null contract in a config-local plugin - a missing wrapper option is a feature request, not a reason to hand-roll the integration.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import { transform } from "hellajs-compiler";
import viteHellaJS from "vite-plugin-hellajs";

// Re-implementing the wrapper from the config: the extension filter,
// per-environment target, and null contract are already owned by viteHellaJS().
export default defineConfig({
  plugins: [
    viteHellaJS(),
    {
      name: "hella-retransform",
      transform(code, id) {
        return transform(code, { filename: id });
      },
    },
  ],
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// JSX-free .ts files return null from the wrapper and fall through to
// Vite's native TS strip; nothing further belongs in this config.
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `.agents/skills/compiler-best-practices`
