---
title: Sweep sibling packages' test files for a removed API; astro frontmatter fixtures run the real package
description: A removed css overload had zero source call sites yet two live consumers in plugins/astro/tests/frontmatter.test.ts string fixtures; the frontmatter folding evaluator runs fixture code against the real @hellajs/css, so those assertions tracked the old merge semantics.
tags: [sweep, blast-radius, cross-package, astro, css, fixtures, tests]
confirmed: 2026-11-25
---
# Why

A sweep for a removed API shape that excludes `*.test.ts` (natural when hunting call sites) misses consumers that live inside other packages' tests as string fixtures. The astro frontmatter extractor folds `.astro` frontmatter by evaluating fixture source with the REAL `@hellajs/css` functions, so every `style(...)` shape asserted there is a live consumer of the css API. A css API change turns those assertions red under `vp run coverage astro` while `vp run coverage css` stays green, and a contract whose blast radius says "no cross-package importer" ships with a sibling suite already broken.

# Evidence

2026-11-25, css `style(base, override)` overload removal:

    rg -n -U "style\(\s*\n?\s*[A-Za-z_$][A-Za-z0-9_$]*\s*,\s*\n?\s*\{" packages/*/lib plugins examples docs/src packages/ui packages/headless -g '!*.test.ts' -g '!*.mdx' -g '!*.md' -g '!**/dist/**'

returned nothing. The same shape without `-g '!*.test.ts'` hit `plugins/astro/tests/frontmatter.test.ts` twice: `const merged = style(base, { color: "blue" })` in the test "folds same-module const bindings: object merge, positional label, and options bag" (asserting a rule carrying both objects' declarations) and `style(base, { animation: ... })` in "folds imports through a stubbed resolver: const objects and composed keyframes names" (asserting the base's declaration plus the animation).

`plugins/astro/evaluate.mjs` `evaluateCall`: `const result = (fnName === "recipe" ? callable : REAL_FNS.get(fnName))(...args);` with `style` imported from `@hellajs/css` at the top of the file, and an `ArrayExpression` arm that evaluates array literals element by element.

After the array overload landed, the two tests failed 2 / 20 (`expected '.cmktezq {\n  font-size: 14px;\n}' to match /animation: kf-[a-z]+ 1s linear/`); retargeted to `style([base, { ... }])` they passed, `vp run coverage astro` exit 0 (28 passed).
