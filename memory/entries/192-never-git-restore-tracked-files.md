---
type: correction
title: Never git-restore tracked files inside a component worktree; recover via AGENTS tables
description: Worker worktrees hold every prior unit's work UNCOMMITTED, so `git checkout/restore <file>` silently discards sibling units; recover from package AGENTS tables plus dist, not git.
tags: [worktree, git]
timestamp: 2026-09-19
last_confirmed: 2026-09-19
triggers: [git-checkout, worktree-restore, registry-json, uncommitted-units, recover-manifest]
---
# Why
A worktree carries the whole plan set's delivered-but-unmerged state as uncommitted
changes on top of the base commit. Running `git checkout -- <file>` (or `git restore`)
to undo a local formatting mistake restores the BASE version and wipes every unit's
delta in that file in one step. Git cannot recover it; the worktree protocol has no
stash. The safe undo for a local edit is re-editing the file, never a git restore.

# Evidence
Unit 17 of plans/ui/code/ui-shadcn-components ran `git checkout registry/registry.json`
after a jq reformat; it silently dropped 50 unit-added entries (units 02-16). Recovery:
registry.test.ts keys must match `dist/registry/` dirs (which were untouched), entry
shape/files/deps derive from packages/ui/AGENTS.md §Registry table rows, and full
entries for delivered units were recoverable from the session transcript. Restored
file passed `bun test tests/registry.test.ts` 7/7 and the full `bun coverage ui` gate.
