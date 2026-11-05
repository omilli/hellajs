---
title: Consume the returned sourcemap as-is: it is already chained
impact: HIGH
impactDescription: a dropped or hand-rebuilt map points every stack trace and breakpoint at generated code
tags: compiler, sourcemap, remapping, debug
---

## Consume the returned sourcemap as-is: it is already chained

`TransformResult.map` arrives fully composed: for ts/tsx the print-stage map resolves through the oxc strip-stage map via `@ampproject/remapping`; for js/jsx the print map ships alone. Both carry `version: 3`, `sources: [filename]`, and `sourcesContent`, at node-start granularity (expression-level original positions, sufficient for stack traces and breakpoints). Forward the object verbatim to the host bundler (`return { code: result.code, map: result.map }`); never rebuild a map from line arithmetic over the output and never run your own strip stage to chain maps, the engine already did both.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// The map is dropped: downstream tools attribute every position in the
// emitted code to the output file instead of the authored source.
const result = transform(code, { filename: id, lang: "tsx", target: "dom" });
return result ? { code: result.code } : null;
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// The returned map is the composed strip-then-print chain: forward it.
const result = transform(code, { filename: id, lang: "tsx", target: "dom" });
return result ? { code: result.code, map: result.map } : null;
```

Reference: `plugins/compiler/src/pipeline.mjs buildPrintMap` and `plugins/compiler/tests/sourcemap.test.ts` and `plugins/rollup/index.mjs`
