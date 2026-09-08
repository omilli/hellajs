---
type: decision
title: Component worktrees seed clean from v2 + carry the plan set + uncommitted memory delta; merge-back is a 3-way apply of the post-seed-baseline diff; no code is ever carried between worktrees
description: A plan-file worker run executes in a worktree cut clean from v2 carrying exactly the plan set and the uncommitted memory delta — never main-tree code; merge-back applies the post-seed-baseline diff.
tags: [process, git, plans]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [worktree-seeding, component-worktree, plan-carry]
supersedes: 061
---
# Why

The main tree routinely holds unrelated in-flight units (uncommitted feature slices, untracked `plans/` dirs) that must never leak into an executing unit or its baseline, and rollback of a whole component must be a single `clean`. Plans are untracked, so an isolated execution must carry the plan set explicitly; `memory/` is tracked, so only its uncommitted delta rides along. Seeding clean from `v2` plus exactly those two carries makes the worktree compile base + own changes + carries — repo-wide tsc inside the worktree cannot see main-tree uncommitted state, which retires 061's mid-unit red-HEAD carry deadlock: the only code in the worktree is committed base plus the component's own edits. The post-seed baseline (recorded after the carry lands) is the invariant: `diff` and `apply` are both baseline-relative, so unchanged carries are invisible and a stale sibling copy can never revert another component's merged ticks. Merge-back is the merge skill's 3-way apply of that baseline diff — the single human checkpoint; nothing else transfers code between trees.

# Evidence

Session 2026-09-08 (plans/root/config/skill-automation unit 02 verification, five `bun plans` runs over `.plans-runner/fixture` + `fixture-gate`): every provisioned worktree (`worktree.mjs new`, base `v2`) compiled and completed with zero code carries — only the plan-set folder and `git diff HEAD -- memory/` + untracked memory files rode along; merges (runs A, B1, C, D) applied post-seed-baseline patches via `git apply --3way` and cleaned the worktrees, with unchanged carries emitting nothing. Git facts verified the same session: `plans/` untracked (`?? plans/` in `git status -sb`), `memory/` tracked (91 entries), runner fixtures gitignored (`.gitignore` `.plans-runner/`). Decision source: `plans/root/config/skill-automation/spec.md` D2.
