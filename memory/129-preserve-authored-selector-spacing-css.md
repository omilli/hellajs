---
title: Preserve authored selector spacing in css() emission, reset.test.ts pins the preflight byte-exact
description: Never canonicalize whitespace in process()'s composed selectors — the preflight exact-text suite asserts authored `", "` spacing, so normalize-and-rejoin breaks it.
tags: [css, emission, spacing, reset, preflight, process, selectors]
confirmed: 2026-11-10
---

# Why

`packages/css/tests/reset.test.ts` ("emits the exact preflight text") asserts the
server `cssText()` of `css(reset)` verbatim, including authored `", "` spacing in
top-level group keys like `"*, ::after, ::before, ::backdrop, ::file-selector-button"`
(`packages/css/lib/reset.ts`). Any emission change that trims parts or normalizes the
comma join (bare `,`) rewrites that text and fails the suite even though the CSS
matches identically. `process()` in `packages/css/lib/css.ts` therefore composes
nested selector parts from their raw slices: `&`-substituted and verbatim parts keep
the spacing around each comma; only a descendant-composed part trims (the parent
prefix supplies its own boundary).

# Evidence

A bare-`,` canonicalizing variant of `composeNestedSelector` failed
`node ./scripts/coverage.ts css` on reset.test.ts "emits the exact preflight text"
(281 passed, 1 failed); the raw-slice variant passed 283/283 with the reset suite
unmodified (2026-11-10).
