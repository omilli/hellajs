---
title: Set vi.resetModules plus dynamic subpath imports for feature-gating stub tests
description: With vitest `isolate: false` the module registry is shared per fork, so a stub-default test needs `vi.resetModules()` in beforeEach and dynamic `import("@hellajs/dom/<subpath>")` inside each test — static imports pin whatever registry the first-loading file built.
tags: [vitest, module-isolation, testing, feature-gating]
confirmed: 2026-12-17
---
# Why      Under `isolate: false` a test asserting no-feature defaults will nondeterministically see features registered by an earlier test file in the same fork (any file importing the `@hellajs/dom` barrel loads error/raw/hydrate features at module init). Static subpath imports have the same problem. The pattern: `vi.resetModules()` per test, then `await import("@hellajs/dom/mount")` et al. inside the test body; reset shared state via dynamically imported `resetDom` — never `@utils/test-helpers.js`, which imports the barrel and defeats the graph.
# Evidence  `features.test.ts` first ran with static subpath imports and failed 3/7 under the coverage gate but passed standalone; the resetModules + dynamic-import pattern made it deterministic (7/7 in both scopes). Related: test files exercising hand-built gated vnodes without triggering JSX (e.g. hand-built `"e:click"` props) must carry the documented `import "@hellajs/dom/features/<name>"` escape hatch themselves — suite-pass/fail depended on file execution order until they did.
