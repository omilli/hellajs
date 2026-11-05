---
title: Order rollupHellaJS() ahead of plugins that consume compiled output
impact: HIGH
impactDescription: a consumer plugin earlier in the array sees raw JSX or raw TS and the build fails on modules the wrapper was about to own
tags: rollup, plugin-order, minify
---

## Order rollupHellaJS() ahead of plugins that consume compiled output

The wrapper's `transform` hook claims every `.js`/`.ts`/`.jsx`/`.tsx` module outside `node_modules`, and Rollup runs `transform` hooks in plugins-array order. Put the wrapper before plugins that consume compiled output - minifiers above all. The plugin object carries `enforce: "pre"`, but `enforce` is a Vite field: under plain Rollup it is inert, and the array position is the only ordering control. Match the bench config's shape - TypeScript first (type-check and TS strip, JSX preserved), the wrapper second, `node-resolve` for the bare `@hellajs/*` specifiers compiled output imports, the minifier last.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  // terser parses the raw .tsx before the wrapper compiles it -
  // enforce "pre" does not reorder anything under plain Rollup
  plugins: [terser(), rollupHellaJS()],
};
```

**Correct (what is right):**

```ts
import typescript from "@rollup/plugin-typescript";
import rollupHellaJS from "rollup-plugin-hellajs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [typescript(), rollupHellaJS(), resolve()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `examples/bench/rollup.config.js`
