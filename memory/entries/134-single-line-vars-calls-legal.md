---
type: decision
title: Single-line vars() calls are legal in docs; the multiline rule and its guard bind css()/style() only
description: guides/docs.md's multiline rule ("one property per line") and lint:structure's INLINE_CSS_OBJECT_RE scope to css()/style() calls only; vars() may compress to one line when an example needs the space.
tags: [docs, guards]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [docs-example-length, single-line-vars, inline-css-guard]
---

# Why
The Example Code Style rule is titled "Multiline `css()` / `style()` calls" — its scope is the two
call forms, not every css-package creator. An operator authorization (plans/css/audit/docs unit 04,
2026-09-10) confirmed the reading: when an index example floors above the length cap under the
guide's named levers, compressing `vars()` to a single-line call is guide- and guard-legal. Without
this, a future worker re-multilines `vars()` to "fix" a length overflow that has a legal shorter
path, or an auditor flags single-line `vars()` as a violation by pattern-matching the css rule.

# Evidence
`scripts/doc-structure.ts:89` — `INLINE_CSS_OBJECT_RE = /(css|style)\(\{[^}\n]*\}\)/` matches only
`css(`/`style(` flat single-line object arguments; nested or multiline calls cannot match.
`guides/docs.md` §Code Examples → Example Code Style — rule heading and body name `css()`/`style()`
only. Applied in `packages/css/docs/index.mdx` Example block (line 25,
`vars({ accent: () => darkMode() ? '#93c5fd' : '#3b82f6' })`), guard-green via `bun lint:structure`
exit 0 on 2026-09-10.
