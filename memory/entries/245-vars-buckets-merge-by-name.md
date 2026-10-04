---
type: correction
title: vars() buckets merge by name — token sheets sharing scope+layer overwrite each other
description: vars() buckets merge by name within scope+layer — fixed in site unit 08: site tokens register UNLAYERED (distinct bucket + cascade-rank win), not load order.
tags: [css, docs-site]
timestamp: 2026-10-03
last_confirmed: 2026-10-03
triggers: [vars-bucket, tokens-sheet, island-ssr, csstext-head, registry-override]
---
# Why
Unit 06's tokens.ts header claims the site sheet wins by loading "AFTER the registry sheet (later declaration wins at equal specificity)". Refuted for island pages: `vars()` buckets are keyed by composite scope+media+layer and hold a per-name `Map`, so two sheets in the same bucket merge by name with last-writer-wins — build-order dependent, not controllable by import order across worker-isolated prerender batches. Consequence in the built docs: content pages (117) carry pure site tokens, island pages (63) carry the merged bucket (registry values on the 19 shared names + site-only names like the base ladder), zero pages carry both. No rendering regression vs the pre-07 status quo (island pages already rendered registry palette). FIXED in site unit 08: `docs/src/styles/tokens.ts` registers unlayered (no `layer` option → distinct `||:root` bucket ends the name-merge, and unlayered normal declarations outrank every layered one by cascade-layer rank — position- and registration-order-independent; also matches the registry sheet's own "unlayered author CSS always wins" override contract). Verified post-fix: 180/180 tagged pages carry the site `--foreground` unlayered, 0 layered, 0 registry-only pages; the registry string persists on 63 island pages as an inert layered superset (cssText() collects everything registered in-process — expected, harmless). Scope was rejected as the lever: `html` loses to `:root` at equal layer, and `:root` is the ceiling for element-attached custom properties.

# Evidence
`packages/css/lib/internal/vars.ts` — `scopedVarsRulesMap` bucket interface (`vars: Map<string, string>` keyed by composite scope+media+layer). Built-docs probe (07 session): `--foreground:oklch(97.807% 0.029 256.847)` (site) in 117 pages, `--foreground:oklch(0.985 0 0)` (registry, registered during island SSR) in 63 pages, `both=0`.
