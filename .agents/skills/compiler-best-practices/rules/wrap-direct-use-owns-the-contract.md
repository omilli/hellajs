---
title: A direct caller owns the whole wrapper contract: filter, target, null, map
impact: MEDIUM
impactDescription: missing one leg of the contract double-processes dependencies, drops maps, or compiles the wrong currency
tags: compiler, integration, bundler, contract
---

## A direct caller owns the whole wrapper contract: filter, target, null, map

Calling `transform` directly means inheriting everything the wrappers otherwise handle, as one unit: (1) filter to js/jsx/ts/tsx and skip anything under node_modules, or every dependency pays the pipeline; (2) resolve the target per environment (server `ast`, client `dom`); (3) pass JSX-free null returns through to the host instead of erroring; (4) forward `result.map` verbatim. Each leg is one line in isolation; a direct integration missing any one of them degrades silently.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// No filter (dependencies compiled too), no null handling (plain modules
// crash the destructuring), map dropped.
export function load(id: string) {
  const { code, map } = transform(read(id), { filename: id, target: "dom" });
  return { code, map };
}
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

const langOf = (id: string) =>
  id.endsWith(".tsx") ? "tsx" : id.endsWith(".ts") ? "ts" : id.endsWith(".jsx") ? "jsx" : "js";

export function load(id: string, server: boolean) {
  if (!/\.(js|jsx|ts|tsx)$/.test(id) || id.includes("node_modules")) return null;
  const result = transform(read(id), {
    filename: id,
    lang: langOf(id),
    target: server ? "ast" : "dom",
  });
  return result ? { code: result.code, map: result.map } : null;
}
```

Reference: `plugins/vite/index.mjs` and `plugins/rollup/index.mjs` and `plugins/compiler/index.d.ts transform`
