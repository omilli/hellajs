---
type: decision
title: Park build-baseline snapshots outside packages/<pkg>/dist - bun bundle wipes the whole dist dir
description: `bun bundle <pkg>` cleans all of `packages/<pkg>/dist/` - park before/after snapshots outside dist (e.g. `packages/<pkg>/.name-baseline`) and delete them after.
tags: [tooling]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [dist-snapshot, before-after-diff, bundle-clean-scope, baseline-compare, registry-rebuild]
---
# Why

Verifying "emitted output is unchanged" (refactors that must be computed-identical) invites
snapshotting the old `dist/` next to the new one. Parking the snapshot inside `packages/<pkg>/dist/`
loses it silently: the bundle script's first step removes the entire package dist directory, so the
second build (the one producing the new output) erases the baseline mid-comparison. The failure is
quiet - `diff` then reports "No such file or directory", which reads as a snapshot-name typo, not a
deleted tree. Cost observed: two full rebuild cycles in one unit before the cause was isolated.

Alternatives considered: snapshotting to `/tmp` (repo rule: test and build inside the repo's own
folders); git stash dance (higher blast radius mid-unit). A dot-parked dir beside dist (gitignored
parent, deleted at the end of the check) is the smallest correct shape.

# Evidence

`scripts/bundle/registry.ts` is invoked after the orchestrator's `fs.rm(distDir)`-equivalent: two
observed runs of `bun bundle ui` in the same session each deleted `packages/ui/dist/.registry-baseline`
(`diff: .registry-baseline: No such file or directory`, exit 2). Re-run with the snapshot at
`packages/ui/.registry-baseline` (outside dist) survived both builds and the diff completed.
