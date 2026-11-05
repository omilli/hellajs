---
title: Pick the target by build environment: ast for the server, dom for the client
impact: CRITICAL
impactDescription: a dom-target build handed to the server leaves the stringifier nothing to walk, and an ast build in the client bundle forfeits the hoisted-template fast path
tags: compiler, target, ssr, dom, environment
---

## Pick the target by build environment: ast for the server, dom for the client

One engine, two currencies. `target: "dom"` (the default) lowers every element and fragment to imperative `@hellajs/dom/runtime` construction: literal props fold into a hoisted `template()` html string and a `mark()`ed build fn wires the dynamic parts. `target: "ast"` emits plain HellaNode objects (`{ tag, props, children }`) with fully-static subtrees hoisted to module consts, the only shape `@hellajs/ssr`'s walk consumes (it classifies children by their `tag` field, so imperative construction output has no tree to stringify). Resolve per environment the way `vite-plugin-hellajs` does: server builds (`transformOptions.ssr === true` or a Vite 6+ server-consumer environment) get `"ast"`, client builds `"dom"`; the rollup wrapper is a client-bundle tool that defaults to dom and needs an explicit `"ast"` for server output.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// One hard-coded target for both arms of an SSR build: the server arm
// receives imperative runtime construction, and @hellajs/ssr has no
// HellaNode tree to walk.
const result = transform(code, { filename: id, lang: "tsx", target: "dom" });
return result ? { code: result.code, map: result.map } : null;
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// Resolve the target per environment like vite-plugin-hellajs: server
// consumers get the ast HellaNode currency, the client the dom build.
const server = ssr === true || environment?.config?.consumer === "server";
const result = transform(code, {
  filename: id,
  lang: "tsx",
  target: server ? "ast" : "dom",
});
return result ? { code: result.code, map: result.map } : null;
```

A wrapper-level `target` option passed by the user wins verbatim over the per-environment resolution.

Reference: `plugins/compiler/index.d.ts TransformOptions` and `plugins/vite/index.mjs viteHellaJS` and `packages/ssr/lib/internal/walk.ts walkChildGen`
