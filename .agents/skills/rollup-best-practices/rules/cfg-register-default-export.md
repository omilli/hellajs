---
title: Register rollupHellaJS() once, in the plugins array, as a called default import
impact: CRITICAL
impactDescription: a misregistered plugin transforms nothing and the build fails on every JSX module as a parse error
tags: rollup, registration, plugins-array
---

## Register rollupHellaJS() once, in the plugins array, as a called default import

Register the factory's default export once, in the `plugins` array of `rollup.config`: `import rollupHellaJS from "rollup-plugin-hellajs"`. The package's exports map exposes only the root, carrying a single default export (`rollupHellaJS(options?)`) - there is no named export to destructure. The array takes the plugin object the factory returns, not the factory itself: `plugins: [rollupHellaJS]` registers a bare function, so no hooks (`resolveId`, `load`, `transform`) ever run and every `.tsx` module reaches Rollup untransformed. Call it - `rollupHellaJS()` - exactly once; the returned object names itself `"rollup-plugin-hellajs"` and needs no further wiring.

**Incorrect (what is wrong):**

```ts
import { rollupHellaJS } from "rollup-plugin-hellajs"; // no named export exists

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  // the factory is also never called: a function in the plugins array
  // registers no hooks, so JSX ships untransformed
  plugins: [rollupHellaJS],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/rollup/package.json` and `examples/bench/rollup.config.js`
