---
title: Pass only target - every other key is silently ignored
impact: MEDIUM
impactDescription: include/exclude or engine-level options do nothing, so a config that looks scoped still transforms every js/ts/jsx/tsx module outside node_modules
tags: rollup, options, validation
---

## Pass only target - every other key is silently ignored

`{ target }` is the entire options surface: the wrapper reads `pluginOptions.target` and nothing else. Unknown keys never reach the engine, so nothing throws and nothing applies - `rollupHellaJS({ target: "dom", extrakey: 1 })` constructs exactly the same plugin as `rollupHellaJS()`. There is no Rollup-conventional `include`/`exclude` filtering; the transform claims every `.js`/`.ts`/`.jsx`/`.tsx` module outside `node_modules` regardless. Engine-level options cannot be passed through either: `filename` and `lang` are derived from each module's id, and an invalid value surfaces as a `[hellajs-compiler]` throw naming the engine option - scope the build with `input`, not with plugin options that do not exist.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// include/exclude do not exist on this wrapper: both keys are silently
// dropped, and every js/ts/jsx/tsx module outside node_modules transforms
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS({ include: ["src/**"], exclude: ["src/legacy/**"] })],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// no scoping options exist; the entry graph is the scope
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/rollup/index.d.ts RollupHellaJSOptions`
