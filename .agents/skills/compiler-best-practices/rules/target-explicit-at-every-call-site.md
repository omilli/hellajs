---
title: Pass an explicit target at every call site, never the dom default
impact: LOW
impactDescription: an omitted target resolves to the client currency, so a server-adjacent call silently compiles the wrong output
tags: compiler, target, options, default
---

## Pass an explicit target at every call site, never the dom default

`target` defaults to `"dom"` (the option validator substitutes it when the key is absent), and that default is deliberately the client currency: the engine cannot know which bundler environment is calling. Every real call site in this repo passes an explicit target, either per environment (the vite wrapper resolves server vs client per transform) or once at construction (the rollup wrapper's `pluginOptions.target ?? "dom"`). Relying on the default in your own integration couples the emission currency to a default you never chose; a future default flip or a copied call into a server path compiles the wrong output with no error.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// Omitted target: a server-side consumer of this helper silently gets
// imperative dom output instead of the HellaNode currency.
export function compile(code: string, filename: string) {
  return transform(code, { filename, lang: "tsx" });
}
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// The caller owns the environment decision and states it.
export function compile(code: string, filename: string, target: "ast" | "dom") {
  return transform(code, { filename, lang: "tsx", target });
}
```

Reference: `plugins/compiler/src/pipeline.mjs validateOptions` and `plugins/rollup/index.mjs rollupHellaJS`
