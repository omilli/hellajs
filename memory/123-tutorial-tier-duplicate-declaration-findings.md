---
title: tutorial-tier duplicate-declaration findings are the byte-parity floor
description: "doc-snippets' tutorial tier structurally reports TS2451/TS2323/TS2393 (and TS2448/TS2454/TS18046 cascades between the duplicates) for every multi-file tutorial whose Complete Code byte-mirrors src files: not reorderable defects, never chase them."
tags: [doc-snippets, tutorials, examples, complete-code, verification]
confirmed: 2026-11-07
---
# Why

`doc-structure.ts` check 2 requires every `### src/...` block under a tutorial's `## Complete Code` to byte-match the real file, while the doc-snippets emitter hoists every export-bearing teaching block to module scope. A multi-file tutorial therefore declares every export twice (once in its teaching section, once in Complete Code), and tsc reports the redeclares (TS2451; TS2323/TS2393 for `export default`) plus cascades on references between the duplicate declarations (TS2448/TS2454) and unknown-typed params inside them (TS18046/TS7006). None of this is fixable by reordering blocks or adding context markers: the duplicates ARE the parity contract. Per-example floors measured 2026-11-07: counter 0 (re-measured same day after the simplified mirror rewrite removed its component-scope forward refs; was 9 via TS2304/TS2552), theme-switcher 0 (module-scope state), todo 68 (state inside a component closure), blog 34, ssr-islands 4, ssr-routing 16, ssr-streaming 10, astro 18.

# Evidence

`node ./scripts/doc-snippets.ts` before/after the 2026-11-07 best-versions pass: blog 34 findings both sides, but the pre-pass TS2448s were assumed reorderable and diagnosed as cascades of the TS2451s (tsc on the emitted module showed the use sites sit AFTER the declaration inside the same hoisted chunk); astro's six TS2323/TS2393 pairs each map to one component appearing exactly once in its teaching section plus once in byte-mirrored Complete Code. todo's pre-pass count of 2 was an artifact: a TS1109 syntax error aborted parsing and suppressed all downstream diagnostics; fixing it revealed the true floor of 68.
