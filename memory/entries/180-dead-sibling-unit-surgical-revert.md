---
type: decision
title: "Dead mid-flight sibling unit in a shared worktree: revert its partial registry state surgically (registry.json entry + files + AGENTS row + variants block), never git-checkout the manifest"
description: "A dead unit's partial registry.json entry reds the enumerated test lists for later units; revert surgically (entry block, registry files, AGENTS row, variants block, dist) so it re-runs from its plan."
tags: [ui, worker, worktree, registry, triage, dead-run]
timestamp: 2026-09-23
last_confirmed: 2026-09-23
triggers: [dead-worker, mid-flight-unit, red-baseline, enumerated-lists, registry-partial-state, unit-20-carousel]
---
# Why

The shadcn-catalog set runs as ONE dependency-connected component in one worktree, so a crashed unit's landed-but-unticked files sit in every later unit's baseline. `bun coverage ui` fails on exactly the enumerated lists (listComponents array, `list` stdout string, drift add lists) because registry.json has the entry while the lists do not. Completing the lists instead (the green-it path) preserves the work but puts the live session's name on a dead sibling's unverified delta; the user chose revert so unit 20 re-runs clean from its plan.

# Evidence

Session 2026-09-23, sidebar unit (21): unit 20 (carousel) had 4 registry files + registry.json entry + AGENTS row landed at 10:34-10:40, zero ticks, no process alive; baseline coverage red with 2 failures (main list + cli-e2e list). Surgical revert (text-level registry.json edit keyed to the carousel block, rm registry/carousel + dist/registry/carousel, AGENTS row drop, variants.ts trailing block trim) restored exit 0 / 2679 pass. jq was rejected for the manifest edit — it reformats the whole file (memory 177's no-checkout rule applies equally to whole-file rewrites).
