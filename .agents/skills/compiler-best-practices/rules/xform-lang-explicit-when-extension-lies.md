---
title: Pass lang explicitly when the module id is not a real filename
impact: MEDIUM
impactDescription: virtual module ids resolve to js, so TypeScript syntax reaches the acorn parse and fails with a bare syntax error
tags: compiler, lang, filename, virtual modules
---

## Pass lang explicitly when the module id is not a real filename

Language resolution: an explicit `lang` wins; otherwise the filename extension decides (`.tsx`, `.ts`, `.jsx`; everything else, including `.js`, `.mjs`, and virtual ids like `\0virtual/entry`, compiles as js). Only the ts/tsx path runs the oxc strip stage, and that stage is the only thing removing type syntax, so TS source compiled as js fails the acorn parse with `[hellajs-compiler] Unexpected token`. Virtual modules, string-fed codegen, and non-extension ids must pass `lang` explicitly; real files can derive it from the extension exactly like the wrappers' `langOf`.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// "app/virtual-entry" carries TSX but resolves to js: the strip stage
// never runs and the acorn parse throws on the first type annotation.
const result = transform(tsxSource, { filename: "app/virtual-entry", target: "dom" });
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// Explicit lang: the strip stage runs ahead of the parse.
const result = transform(tsxSource, {
  filename: "app/virtual-entry",
  lang: "tsx",
  target: "dom",
});
```

Reference: `plugins/compiler/src/pipeline.mjs resolveLang` and `plugins/compiler/tests/transform.test.ts` and `plugins/vite/index.mjs`
