---
title: Author skills-check Correct fences self-contained; DOM query callbacks must coerce null to undefined
description: "Correct-position fences in *-best-practices rules are emitted verbatim into tsc modules - every referenced identifier must be declared or a parameter in the fence, and DOM lookups handed to `() => HTMLElement | undefined` callbacks need `?? undefined` (`querySelector` returns null)."
tags: [skills-check, fences, tsc, snippets, best-practices-skills, null-undefined]
confirmed: 2026-11-04
---

# Why

`vp run skills-check` emits every non-Incorrect ts/tsx fence of a rule file into one scratch module (nested block scopes, merged imports) and compiles it against the real workspace packages - the fence is typechecked code, not illustrative prose. Two authoring traps red the gate on otherwise-correct teaching examples: (1) free identifiers that "obviously exist" in the reader's app (`panel()`, `overlay()`, `close()`) are TS2304 in the emitted module - wrap the example in a function whose parameters declare them, or declare locals (`document.createElement`); (2) option callbacks typed `() => HTMLElement | undefined` (e.g. `TrapFocusOptions.initialFocus`) reject a bare `querySelector` chain whose type is `HTMLElement | null` (TS2322 under strict) - append `?? undefined`. Incorrect fences are skipped by the label discriminator and may stay loose.

# Evidence

- `scripts/snippets/emit.ts` (emitModules: blocks nested in `export async function __doc()`, import union hoisted) and `scripts/skills-check.ts` (checkableBlocks: Incorrect-label blocks dropped) read in the repo.
- First `vp run skills-check` run over a 29-rule `headless-best-practices` corpus (2026-11-04) red 3 findings: `TS2304 Cannot find name 'overlay'/'anchor'` (undeclared getters in an onOutside fence) and `TS2322 Type '() => HTMLElement | null' is not assignable to type '() => HTMLElement | undefined'` (an initialFocus callback); declaring the getters as arrow parameters and appending `?? undefined` re-ran the gate to `69 blocks (0 findings)`.
