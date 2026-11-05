---
title: Compile the server entry to HellaNode with the plugin
impact: HIGH
impactDescription: the stringifier consumes compiled HellaNode ASTs, so a server entry that skips the transform carries uncompiled JSX and the render never sees a tree
tags: server, plugin, compiler, jsx, entry
---

## Compile the server entry to HellaNode with the plugin

`ssr` serializes a HellaNode AST; JSX becomes one only through the hellajs compile step (`vite-plugin-hellajs`, `rollup-plugin-hellajs`, or `hellajs-compiler`'s `transform` directly). The transform must run on the **server** entry - it is a compile-time pass, and wiring it into the client build alone leaves the server arm with raw JSX: the module fails to load under plain `node`, or the value handed to `ssr` is not a HellaNode and the entry guard throws. The targets differ per arm and both matter: the client compiles to `target: "dom"` (imperative runtime construction), the server to `target: "ast"` (the HellaNode shape `@hellajs/ssr` walks).

**Incorrect (what is wrong):**

```ts
// A stand-in for the plugin factory; the point is where the plugin lands.
const hella = () => ({ name: "hellajs" });

// The plugin never reaches the server arm: the server entry (ssrLoadModule /
// the ssr environment) still carries raw JSX, so import fails or ssr
// receives something without a tag.
const clientOnly = {
  plugins: [hella()],
  build: { rollupOptions: { input: "/src/client.tsx" } },
};
```

**Correct (what is right):**

```ts
// vite.config - the plugin runs on every environment, so the client arm
// compiles to the dom target and the server arm to the AST the
// stringifier walks; keep it in the pipeline for both.
import { defineConfig } from "vite";
import hella from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [hella()],
});
```

Bundling the server with esbuild instead? Apply `hellajs-compiler`'s `transform(source, { target: "ast" })` as an onLoad plugin for the server entry - see `examples/ssr-islands/build.mjs`.

Reference: `packages/ssr/docs/api/ssr.mdx` and `examples/ssr-islands/build.mjs`
