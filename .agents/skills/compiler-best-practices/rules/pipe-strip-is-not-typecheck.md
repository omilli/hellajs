---
title: The TS stage strips types, it never typechecks
impact: MEDIUM
impactDescription: treating the strip pass as a type gate ships type errors to runtime with zero build signal
tags: compiler, typescript, oxc, typecheck
---

## The TS stage strips types, it never typechecks

For ts/tsx input the pipeline runs oxc-transform's `transformSync` with `jsx: "preserve"` and `sourcemap: true`: a syntax-only strip that erases annotations, generics, `satisfies`, and type-only imports before the acorn estree parse. oxc errors with severity `"Error"` throw (so broken syntax fails the build), but nothing validates types anywhere in the pipeline. A transform-only integration is type-blind by design; type safety comes from a separate `tsc --noEmit` gate over the original sources, never from the compiler's green light.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// The strip stage erased the annotations without checking them: this
// "validation" green-lights type errors straight into the bundle.
const compiled = transform(code, { filename: "app.tsx", lang: "tsx", target: "dom" });
if (compiled) console.log("app.tsx is valid");
```

**Correct (what is right):**

```ts
import { execSync } from "node:child_process";
import { transform } from "hellajs-compiler";

// Emission and type safety are separate gates: tsc --noEmit over the
// original sources for types, transform for output.
execSync("tsc --noEmit", { stdio: "inherit" });
const compiled = transform(code, { filename: "app.tsx", lang: "tsx", target: "dom" });
```

Reference: `plugins/compiler/src/pipeline.mjs transform` and `plugins/compiler/tests/transform.test.ts` and `plugins/compiler/AGENTS.md`
