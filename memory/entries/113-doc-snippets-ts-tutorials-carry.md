---
type: decision
title: doc-snippets TS tutorials carry structural duplicate-export findings
description: Guide-conformant TS tutorials always emit TS2323/TS2393 informational findings (introduction + Complete-Code parity); scope tutorial DoDs to the strict tier or the probed finding class.
tags: [docs, guards]
timestamp: 2026-09-09
last_confirmed: 2026-09-09
triggers: [doc-snippets-dod, tutorial-findings, complete-code-parity]
---

# Why

`scripts/doc-snippets.ts` emits ONE module per doc and hoists any block scope matching `/^(declare|export) /m` to module top (line 330). The guide-mandated tutorial pattern (guides/docs.md §Tutorial Docs: full component file at its introducing section, then the same file byte-matched in Complete Code) therefore re-declares every exported component: each repeat is a TS2323 (cannot redeclare exported variable) + TS2393 (duplicate function implementation) pair. `js`-tagged tutorials (ssr-islands, ssr-routing) escape because their module is emitted `.js` and parsed loose (`checkJs: false`); `tsx`/`ts` tutorials cannot escape without abandoning the pattern. A DoD line "doc-snippets reports no errors attributed to <tutorial>" is unsatisfiable for a TS tutorial and forces a mid-run interrupt (operator-amended in the astro-islands unit).

# Evidence

- `scripts/doc-snippets.ts` lines 330-339: hoist filter `/^(declare|export) /m` + `export async function __doc()` emission (read this session).
- Baseline informational findings, all pre-existing: blog 34, counter 9, todo 2, ssr-streaming 10; ssr-islands 0 (js module, loose parse). astro-islands floor: 12 findings = 6 sites (3 components x introduction + Complete Code), exit 0, strict tier clean.
- `.doc-snippets/run-*/tutorial/examples_astro-islands_tutorial_mdx.tsx` inspected: duplicates sit at module top, fragments nest inside `__doc()`.
