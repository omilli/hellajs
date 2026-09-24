---
type: decision
title: "Nuking a plan unit from a live set: delete plan file + refs in BOTH trees, amend set index and downstream counts, re-sync carried worktree copies"
description: "User-directed unit deletion: edit the main-tree set folder (drop file, index/depgraph/counts, depends_on, orphaned refs), then mirror deletions and amended files into the worktree's carried copies."
tags: [plans, worker, worktree, set-structure]
timestamp: 2026-09-23
last_confirmed: 2026-09-23
triggers: [nuke-unit, drop-plan-unit, delete-plan-file, set-restructure, carousel-removal]
---
# Why

A plan set's structure is cross-referenced: the index table, the dependency graph, every downstream unit's `depends_on` frontmatter and count-based DoDs, and the vendored refs (ref file, manifest row, per-component icons) all name the unit. Deleting only the plan file leaves dangling references that fail loudly later (a `depends_on` naming a missing sibling blocks the worker dependency gate; count DoDs pin the wrong totals). Plan files are untracked and carried into worktrees, so BOTH trees need the same deletions; the main-tree copy is the structural authority and the worktree's carried copies are refreshed from it (ticks on completed units are preserved by editing only the structural lines).

# Evidence

Session 2026-09-23, `plans/ui/code/ui-shadcn-components/`: user nuked unit 20 (carousel) after its partial state had been surgically reverted (memory 180). Deleted `20-carousel.md`, `refs/shadcn/carousel.tsx`, and `refs/icons/{arrow-left,arrow-right}.svg` (cited only by the carousel manifest row; `arrow-down.svg` kept - cited elsewhere) in both trees; amended `index.md` (55 to 54, depgraph, suggested order, bounded-opens ledger), `22-catalog-sweep.md` (depends_on, 60/62 to 59/61 counts), `refs/manifest.md` (row + `embla-carousel-react` lib-list mention + dangling `unit=20` sidebar row renumber) in the main tree and copied them over the worktree's carried copies. Historical mentions in completed units' rationale blocks (01-primitives' `onDrag` motivation) and memory records stay. Registry recount confirmed the expected totals: 59 components + theme + cn = 61 entries (`jq '.entries | length'`).
