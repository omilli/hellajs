---
type: decision
title: doc-snippets TS tutorials carry structural informational findings
description: Guide-conformant TS tutorials emit tutorial-tier informational findings (exit 0, strict clean); scope tutorial DoDs to the strict tier or a probed finding class, never an absolute no-errors line.
tags: [docs, guards]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [doc-snippets-dod, tutorial-findings, complete-code-parity]
---

# Why

`scripts/doc-snippets.ts` emits ONE module per doc and hoists any block scope matching `/^(declare|export) /m` to module top (line 330); non-exported blocks nest inside each other, so same-name reuse shadows instead of colliding. The guide-mandated tutorial pattern (guides/docs.md §Tutorial Docs: progressive build, then Complete Code where every source file under `examples/{name}/src/` "appears identically") therefore re-declares every exported component: each repeat is a TS2323 (cannot redeclare exported variable) + TS2393 (duplicate function implementation) pair. Other informational classes also arise (shadow collisions, use-before-declare, unresolved names, grammar): the tier is inherently noisy, not TS2323/TS2393-specific. Pure-`js` tutorials (ssr-islands, ssr-routing) escape because their module is emitted `.js` and parsed loose (`checkJs: false`); `jsx` maps into the typed TS module (LANGS_TS), so jsx-tagged tutorials like counter do not escape. A DoD line "doc-snippets reports no errors attributed to <tutorial>" is fragile for any TS tutorial and forced a mid-run interrupt in the astro-islands unit (operator-amended).

# Evidence

- `scripts/doc-snippets.ts` line 330: hoist filter `/^(declare|export) /m` + `export async function __doc()` emission (read this session); `writeTierConfig` sets `checkJs: false`, `LANGS_TS` includes `jsx`.
- Baseline informational findings (live `bun doc-snippets` run 2026-09-26, exit 0, "0 strict, 67 tutorial findings"): blog 37 (TS2451/TS2448/TS2454), counter 9 (TS2552/TS2304), todo 2 (TS1109/TS1005 grammar), ssr-streaming 10 (TS2451); ssr-islands + ssr-routing 0 (pure-js modules, loose parse); theme-switcher 0 (TS tutorial, currently clean; an absolute no-errors DoD still fragile). astro-islands floor: 12 findings = 6 sites (3 components x introduction + Complete Code), exit 0, strict tier clean.
- `.doc-snippets/run-*/tutorial/examples_astro-islands_tutorial_mdx.tsx` inspected: duplicates sit at module top, fragments nest inside `__doc()`.
