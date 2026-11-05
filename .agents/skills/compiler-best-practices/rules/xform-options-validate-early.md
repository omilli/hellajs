---
title: Treat options as validated config: exact keys, eager probe, no catch-and-continue
impact: MEDIUM
impactDescription: a typo'd option key or bad enum surfaces as a confusing first-file error instead of a fail-fast config error
tags: compiler, options, validation
---

## Treat options as validated config: exact keys, eager probe, no catch-and-continue

`transform` validates its options at call time, before the JSX sniff: a non-object value, a key outside `{ filename, lang, target }`, a `target` outside `{ "ast", "dom" }`, or a `lang` outside `{ "js", "jsx", "ts", "tsx" }` throws a `[hellajs-compiler]`-prefixed error naming the offense. Because validation runs before the sniff, `transform("", { filename, target })` exercises only the validation path: both wrappers fire that empty-input probe at plugin construction so a misconfigured build dies at config load, not at the first JSX file. Do not catch-and-continue around these throws; a rejected config means every file compiles wrong.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// Typo ("targets") plus a swallow: the probe throws, the catch logs it,
// and the build proceeds with the engine default target.
try {
  transform("", { filename: "probe.js", targets: target });
} catch (error) {
  console.error("hella config rejected", error);
}
```

**Correct (what is right):**

```ts
import type { TransformOptions } from "hellajs-compiler";
import { transform } from "hellajs-compiler";

// Probe with empty input at construction: validation throws before the
// JSX sniff, so a bad target or unknown key fails the build eagerly.
const options: TransformOptions = { filename: "probe.js", target };
transform("", options);
```

Reference: `plugins/compiler/src/pipeline.mjs validateOptions` and `plugins/vite/index.mjs viteHellaJS` and `plugins/compiler/tests/transform.test.ts`
