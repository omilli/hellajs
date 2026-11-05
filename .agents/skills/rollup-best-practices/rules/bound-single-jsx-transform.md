---
title: Keep one JSX pipeline - rollupHellaJS() owns JSX lowering
impact: MEDIUM
impactDescription: a second JSX-transforming plugin claims the same modules and the two pipelines disagree over who owns the output shape
tags: rollup, jsx, plugin-composition
---

## Keep one JSX pipeline - rollupHellaJS() owns JSX lowering

The wrapper claims every `.js`/`.ts`/`.jsx`/`.tsx` module outside `node_modules` and lowers its JSX in one pass; by the time later plugins see a module, its JSX is already compiled. Do not add a second JSX-transforming plugin - `@rollup/plugin-swc` or babel with a JSX transform configured - to the same config: at best it is dead weight scanning compiled output, at worst two pipelines disagree over who owns `.tsx`. `@rollup/plugin-typescript` is the canonical companion, not a rival: with `"jsx": "preserve"` in tsconfig it type-checks and strips TS while leaving JSX for the wrapper - the bench config pairs exactly these two. The plugin needs no other JSX help; its own transform is the pipeline.

**Incorrect (what is wrong):**

```ts
import swc from "@rollup/plugin-swc";
import rollupHellaJS from "rollup-plugin-hellajs";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  // two JSX pipelines: swc lowers .tsx to createElement calls before the
  // wrapper ever sees them
  plugins: [swc({ jsc: { transform: { react: {} } } }), rollupHellaJS()],
};
```

**Correct (what is right):**

```ts
import typescript from "@rollup/plugin-typescript";
import rollupHellaJS from "rollup-plugin-hellajs";

// tsconfig.json: "jsx": "preserve" - typescript() strips TS and type-checks,
// rollupHellaJS() owns JSX lowering
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [typescript(), rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `examples/bench/rollup.config.js` and `docs/src/pages/plugins/rollup.mdx`
