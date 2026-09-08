---
type: fact
title: "Babel generator retains input quote style: exact-form asserts on transform output must mirror the input's quotes"
description: "plugins/babel exact-form `toBe(normalize(output))` asserts: literals carried from the input keep their original quote character; only newly generated nodes use babel's default double quotes."
tags: [babel, testing, exact-form-asserts]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [exact-form-transform-assert, quote-style-mismatch, normalize-to-be, unshifted-import-quotes]
---
# TL;DR

When writing exact-form assertions (`toBe` on `normalize(output)`) for `plugins/babel` transform
output, mirror the quote character the test's INPUT used for every string literal that survives
the transform (import sources, string props). Babel's generator retains the original quote style
of pre-existing literals; only freshly generated nodes (e.g. an `unshift`ed import declaration,
or a specifier pushed onto a new one) render with the default double quotes.

# Why

A probe run with double-quoted input (`from "@hellajs/dom"`) shows double quotes in the output,
while the same transform fed the file-conventional single-quoted input emits single quotes for
that same literal. Copying an expected string from a probe without also copying the probe's
input quote style produces assertion failures that look like a transform bug but are pure quote
round-tripping. `getNamedImports`-based asserts are immune (regex matches both quote styles).

# Evidence

- Unit B (plans/plugins/babel/code/audit-fixes/02-import-injection-binding.md), 2026-09-08: three
  `toBe(normalize(output))` asserts failed expected `from "@hellajs/dom"` vs received
  `from '@hellajs/dom'` (input used single quotes, matching the file's existing tests); after
  mirroring input quotes, `bun test plugins/babel/tests` 259/0 green.
- Probe pair: `transformSync` of `import { component as c } from "@hellajs/dom"; <Button />`
  (double-quoted input) emits `from "@hellajs/dom"`; the same code with `'@hellajs/dom'` emits
  `from '@hellajs/dom'` — while the injected specifier list itself is generator-produced and
  deterministic (double quotes only where new nodes carry string literals, e.g. none here).
