---
title: Assert compiler output structurally, never byte-for-byte
impact: LOW
impactDescription: byte-pinned goldens break on any engine bump that changes formatting without changing behavior
tags: compiler, testing, snapshots, astring
---

## Assert compiler output structurally, never byte-for-byte

astring is the engine's printer and its formatting is printer freedom: parsed string literals keep their authored quotes (astring prints `node.raw`), spacing and wrapping shift with printer versions. The engine's own suite never asserts byte-level output; it normalizes whitespace or compares structure, and the engine's `tests/helpers.ts` exports the `normalize` driver for exactly that. Integration tests over compiler output should assert on shape: which imports were injected, that a `mark(` build fn exists, that the emitted output re-transforms to null (the JSX-free contract).

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// Byte-golden: the next engine bump reformats (astring printer freedom)
// and this fails even though behavior is unchanged.
const golden = readFileSync("golden.txt", "utf8");
const result = transform("<div>{count()}</div>", { filename: "a.jsx", target: "ast" })!;
if (result.code !== golden) throw new Error("output drifted");
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// Structural assertions: the component import landed, and the emitted
// program carries no JSX so it re-transforms to null.
const result = transform("<Button />", { filename: "a.jsx", target: "ast" })!;
if (!result.code.includes("@hellajs/dom")) throw new Error("component import missing");
if (transform(result.code, { filename: "a.jsx", target: "ast" }) !== null) {
  throw new Error("emitted output still carries JSX");
}
```

Reference: `plugins/compiler/tests/helpers.ts normalize` and `plugins/compiler/tests/transform.test.ts` and `plugins/compiler/AGENTS.md`
