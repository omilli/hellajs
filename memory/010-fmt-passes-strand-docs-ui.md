---
title: Fmt passes strand docs-ui generated roots stale until a full regen runs
description: "`docs/src/components/ui/` and `docs/src/ui-install/` are fmt-ignored and only byte-exact against the CURRENT ui registry, so any registry reformat (e.g. a repo-wide fmt adoption) leaves the committed copies stale until someone runs full `vp run docs-ui`."
tags: [docs-ui, ui, generated, fmt, drift, registry]
confirmed: 2026-10-16
---
# Why

A named-entry regen (`vp run docs-ui <entry>`) rewrites that entry plus `tokens.ts`, so staleness in OTHER components surfaces only when they are regenerated — as unwanted diffs that look like the regen's fault. Committed generated files reflect the registry at the time they were last generated; after a registry-wide reformat they no longer match generator output, and "docs-ui regenerates them byte-exact" is true only against the new registry. When a regen must stay scoped (e.g. a DoD pinning the diff to `tokens.ts` only), revert the exposed stale entries and schedule a full-set regen as its own change.

# Evidence

2026-10-16, worktree: `vp run docs-ui button` produced formatting-only diffs in `docs/src/components/ui/button.tsx` + both `ui-install` variants (wrapped signature/arrays vs compact) — the committed bytes predated the printWidth-80 reformat of `packages/ui/registry/**` (fmt ignores `docs/**` so the roots were never rewritten). Reverting the three button files restored the scoped diff; the full-set regen remains outstanding for the main tree.
