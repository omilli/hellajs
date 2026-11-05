---
title: Engine questions are compiler-best-practices ground; the wrapper only wires them
impact: LOW
impactDescription: reasoning about transform internals from the Rollup config leads to re-implementing behavior the wrapper already forwards
tags: rollup, compiler, boundaries
---

## Engine questions are compiler-best-practices ground; the wrapper only wires them

The wrapper forwards to `hellajs-compiler` and owns no transform semantics: it derives `lang` from each module's extension, forwards `{ filename, lang, target }`, and returns the engine's `{ code, map }` with the already-chained sourcemap. A `null` return - a JSX-free file - hands the module to Rollup's native pass instead (the cheap-skip win). Questions about output shape (dom runtime construction vs HellaNode), sourcemap chaining, the pipeline stages, or the null contract belong to `compiler-best-practices`; this skill covers host wiring only. Same split for other hosts: Vite builds route to `vite-best-practices`, the Astro renderer to `astro-best-practices`. Do not re-implement the wrapper's filter/target/null contract in a config-local plugin - a missing wrapper option is a feature request, not a reason to hand-roll the integration.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";
import rollupHellaJS from "rollup-plugin-hellajs";

// re-implementing the wrapper from the config: the extension filter,
// lang derivation, and null contract are already owned by rollupHellaJS()
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [
    rollupHellaJS(),
    {
      name: "hella-retransform",
      transform(code, id) {
        return transform(code, { filename: id });
      },
    },
  ],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// JSX-free files return null from the wrapper and fall through to Rollup's
// native pass; nothing further belongs in this config
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `.agents/skills/compiler-best-practices`
