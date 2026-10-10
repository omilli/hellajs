---
type: correction
title: Adoption claim-seeding parse-probes each delivered segment — count-equality drains on any platform parse drop
description: "adoptElementRules replays segments into a scratch sheet and claims iff acceptedCount === parsed count; raw segment-vs-rules count equality breaks on vendor-prefix parse drops."
tags: [css, hydration, cssom]
timestamp: 2026-10-08
last_confirmed: 2026-10-08
triggers: [adoption-guard, parse-probe, vendor-prefix, claim-seeding, style-flash]
supersedes:
---
# Why
Chrome parse-drops delivered rules a site legitimately ships — the docs preflight's `:-moz-focusring`/`:-moz-ui-invalid` selectors parse to nothing — so delivered-segment count (1602) exceeded parsed sheet rules (1600) and a raw count-equality guard routed EVERY Chrome page to the drain: never-re-registered styles (preflight, global, prose, astro-folded rules) were deleted at hydration and stayed gone (body line-height 24px → normal post-hydration). The guard replay each segment through `insertRule` into a scratch sheet (`createProbeSheet`: constructable `CSSStyleSheet`, else inert-document fallback) — the platform rejects exactly the segments its parser dropped, so accepted segments align one-to-one with the sheet's rules and claims seed at post-drop indexes. Any accepted≠parsed divergence still drains (mis-split text, parse truncation), and a lenient engine (happy-dom auto-closes unbalanced fragments) may claim coherently where a strict engine drains — both branches preserve never-delete/never-duplicate.
# Evidence
`docs` probe 2026-10-08: segment replay into a scratch sheet accepted 1600/1602 (the two `:-moz-*` segments threw SyntaxError) while `#hella-css`.sheet parsed 1600 — count-equality mismatch isolated; after the probe-amended guard, `bun coverage css` 261 pass incl. "claims align when the platform drops a delivered rule at parse" (happy-dom `@layer` parse-drop shape) and the site probe flipped to early===late on all five pages.
