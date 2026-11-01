---
title: Deepen every module-relative path when relocating a test file, not just import specifiers
description: A folder move shifts the depth of import specifiers, package-dist relative imports (`../../<pkg>/dist/...`), and runtime `join(import.meta.dirname, ...)` constants alike — sweep all three forms or the moved suite fails to load or read its fixtures.
tags: [testing, file-layout, imports, refactor, vitest]
confirmed: 2026-10-31
---
# Why

Import-specifier rewrites are the obvious edit when moving a test file deeper, but two other
relative-path classes live in test bodies and break just as hard: relative imports reaching
OUTSIDE the package (a sibling package's built dist, e.g. `../../headless/dist/ssr/index.js`
— not matched by a `dist/registry`-shaped rewrite rule) and runtime path constants built from
`import.meta.dirname` (`readFileSync(join(import.meta.dirname, "../../../docs/..."))`). Each
needs the same `../` increment as the specifiers, and a miss fails the whole file at load
(vite import-analysis) or at first read (ENOENT), taking every test in the file with it.

# Evidence

Failing form 2026-10-31: moving `packages/ui/tests/accordion-hydrate.test.tsx` into
`tests/components/accordion/` with only import specifiers deepened — next
`vp run coverage ui` run failed the file with `Failed to resolve import
"../../../headless/dist/ssr/index.js"` (one level short; needed four), and after that,
`ENOENT: packages/ui/docs/src/components/ui/accordion.tsx` from the
`join(import.meta.dirname, ...)` constant (needed five `../` segments to reach the repo
root). Both fixed by sweeping every `../`-bearing literal in the moved file, not only
`from "..."` clauses.
