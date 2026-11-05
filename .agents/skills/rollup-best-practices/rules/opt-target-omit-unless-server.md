---
title: Omit target for client bundles, pin ast only for a server target
impact: CRITICAL
impactDescription: a dom-emitting bundle on the server hands @hellajs/ssr runtime construction where it needs HellaNode, and the server renders nothing
tags: rollup, target, ssr, options
---

## Omit target for client bundles, pin ast only for a server target

Leave `target` unset for client bundles. Unset, the wrapper emits `"dom"` - imperative `@hellajs/dom/runtime` construction - and this default holds in EVERY build: `const target = pluginOptions.target ?? "dom"`. There is no per-environment resolution here, unlike the Vite wrapper - Rollup is a client-bundle tool, and an agent moving from `vite-best-practices` must not assume an unset target auto-detects a server build. Pass `{ target: "ast" }` explicitly only when the bundle runs server-side and its modules feed `@hellajs/ssr` stringification. The option is global to the plugin instance: building both currencies means two Rollup builds, each registering the factory once with its own target.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// server bundle, unset target: emits imperative @hellajs/dom/runtime
// construction - @hellajs/ssr needs HellaNode objects and renders nothing
export default {
  input: "src/server-entry.tsx",
  output: { file: "dist/server.js", format: "es" },
  plugins: [rollupHellaJS()],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// the server bundle pins the server currency explicitly;
// a client bundle in the same project just calls rollupHellaJS()
export default {
  input: "src/server-entry.tsx",
  output: { file: "dist/server.js", format: "es" },
  plugins: [rollupHellaJS({ target: "ast" })],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/rollup/tests/target-option.test.ts` and `plugins/rollup/README.md` and `docs/src/pages/plugins/rollup.mdx`
