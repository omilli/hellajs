---
title: Read a construction-time throw as a target error, never catch past it
impact: MEDIUM
impactDescription: swallowing the throw boots a config whose plugin never registered, and the build fails on untransformed JSX far from the cause
tags: rollup, target, validation
---

## Read a construction-time throw as a target error, never catch past it

`rollupHellaJS()` validates its option eagerly: the wrapper probes the engine once at construction - `transform("", { filename: "hellajs-validate.js", target })` - so a `target` outside `"ast"`/`"dom"` throws `[hellajs-compiler] invalid target ...` while the config loads, before any file transforms. The probe throws before the JSX sniff, so an empty input exercises only the validation. Treat that throw as configuration feedback and fix the option; never wrap the call in try/catch to boot anyway. A caught error means the plugin object never reached `plugins`, and every JSX module then fails later with a parse error far from the real cause.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

const plugins = [];
try {
  plugins.push(rollupHellaJS({ target: "js" })); // not "ast" or "dom"
} catch {
  // swallowed: no plugin registered, JSX ships untransformed
}

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins,
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// an invalid target throws at this call, during config load, naming the
// option; a valid config needs no defensive code around it
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/compiler/src/pipeline.mjs`
