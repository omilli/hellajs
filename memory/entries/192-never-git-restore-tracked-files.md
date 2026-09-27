---
type: correction
title: Never git-restore tracked files inside a component worktree; recover via AGENTS tables
description: Worker worktrees hold every prior unit's work UNCOMMITTED, so `git checkout/restore <file>` silently discards sibling units; recover from package AGENTS tables plus dist, not git.
tags: [worktree, git]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [git-checkout, worktree-restore, registry-json, uncommitted-units, recover-manifest]
---
# Why
A worktree carries the whole plan set's delivered-but-unmerged state as uncommitted
changes on top of the base commit (worktree.mjs: the worker never commits, it
accumulates working-tree state; `merge` commits the delta). Running `git checkout --
<file>` (or `git restore`) to undo a local formatting mistake restores the BASE
version and wipes every unit's delta in that file in one step. Git cannot recover it
(baseline tree has no ref); the worktree protocol has no stash. The safe undo for a
local edit is re-editing the file, never a git restore. Sole sanctioned exception,
from worker SKILL.md: `git checkout HEAD -- bun.lock` for install drift — safe only
because bun.lock carries no component delta by protocol.

# Evidence
Unit 17 of a merged ui plan set (plans never committed; set folder since gone) ran
`git checkout registry/registry.json` after a jq reformat; it silently dropped 50
unit-added entries (units 02-16). Recovery surfaces: registry.test.ts enforces
manifest keys against the source `packages/ui/registry/` dirs; compile.test.ts +
tests/helpers/variants.ts cover the compiled `dist/registry/` artifacts (untouched by
the restore); entry shape/files/deps derive from packages/ui/AGENTS.md §Registry
schema; full entries for delivered units were recoverable from the session transcript.
Restored file passed `bun test tests/registry.test.ts` and the full `bun coverage ui`
gate. Verified 2026-09-27 against worktree.mjs, worker SKILL.md, and the ui tests.
