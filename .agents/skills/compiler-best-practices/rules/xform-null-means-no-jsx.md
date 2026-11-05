---
title: Handle the null return: JSX-free input is a pass-through, not an error
impact: MEDIUM
impactDescription: destructuring the null result crashes the pipeline, and forcing every file through the transform forfeits the cheap-skip win
tags: compiler, null, jsx, passthrough
---

## Handle the null return: JSX-free input is a pass-through, not an error

`transform` sniffs with `code.includes("<")` and counts replaced JSX nodes; JSX-free input returns `null` at both targets, including the empty string. The null is the cheap-skip contract: the caller hands the file back to the host bundler's native TS/esbuild pass instead of paying the pipeline (the wrappers return null from their transform hook and let Vite/Rollup handle the file). The inverse also holds: the walk replaces every JSXElement and JSXFragment, so emitted output is JSX-free and re-transforming it yields null; never chain a second JSX pass over compiler output.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// JSX-free files return null: this destructuring throws on the first
// plain .ts module in the graph.
const { code, map } = transform(source, { filename: id, lang: "tsx", target: "dom" });
emit(id, code, map);
```

**Correct (what is right):**

```ts
import type { TransformResult } from "hellajs-compiler";
import { transform } from "hellajs-compiler";

const result: TransformResult | null = transform(source, {
  filename: id,
  lang: "tsx",
  target: "dom",
});
// Null means no JSX: let the host bundler handle the file natively.
if (result === null) return null;
emit(id, result.code, result.map);
```

Reference: `plugins/compiler/src/pipeline.mjs transform` and `plugins/compiler/tests/transform.test.ts` and `plugins/vite/index.mjs`
