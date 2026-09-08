---
type: decision
title: Component worktrees seed clean from v2 + carry the plan set + uncommitted memory delta; merge-back commits the delta on the wt branch (plans excluded) and cherry-picks it as one commit per task; no code is ever carried between worktrees
description: Worktree runs cut clean from v2 carry exactly the plan set and the uncommitted memory delta; merge-back is a per-task cherry-pick of the committed delta, plan ticks updated agent-side unstaged.
tags: [process, git, plans]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [worktree-seeding, component-worktree, plan-carry]
supersedes: 061
---
# Why

The main tree routinely holds unrelated in-flight units (uncommitted feature slices, untracked `plans/` dirs) that must never leak into an executing unit or its baseline, and rollback of a whole component must be a single `clean`. Plans are untracked, so an isolated execution must carry the plan set explicitly; `memory/` is tracked, so only its uncommitted delta rides along. Seeding clean from `v2` plus exactly those two carries makes the worktree compile base + own changes + carries — repo-wide tsc inside the worktree cannot see main-tree uncommitted state, which retires 061's mid-unit red-HEAD carry deadlock: the only code in the worktree is committed base plus the component's own edits. The post-seed baseline (recorded after the carry lands) is the invariant: `diff` and `commit` are both baseline-relative, so unchanged carries are invisible and a stale sibling copy can never revert another component's merged ticks. Merge-back is the merge skill's per-task flow — `worktree.mjs commit` lands the delta on the wt branch with the carried plan folder excluded (parent = the seed baseline, so carries never ride), and `git cherry-pick` in the main tree makes it one reviewable/revertable commit per task; plan ticks never commit, they are updated agent-side in the unstaged main-tree copies. Nothing else transfers code between trees.

# Evidence

Session 2026-09-08 (plans/root/config/skill-automation unit 02 verification, five `bun plans` runs over `.plans-runner/fixture` + `fixture-gate`): every provisioned worktree (`worktree.mjs new`, base `v2`) compiled and completed with zero code carries — only the plan-set folder and `git diff HEAD -- memory/` + untracked memory files rode along; merges applied the post-seed-baseline delta and cleaned the worktrees, with unchanged carries emitting nothing. Git facts verified the same session: `plans/` untracked (`?? plans/` in `git status -sb`), `memory/` tracked (91 entries), runner fixtures gitignored (`.gitignore` `.plans-runner/`). Decision source: `plans/root/config/skill-automation/spec.md` D2.

2026-09-21 revision (store-audit set merge): the `git apply --3way` merge path was replaced by commit + cherry-pick after it aborted mid-patch with misleading per-file "cleanly" messages while leaving new files unlanded; cherry-pick gives rename-aware native 3-way merges with real conflict stages. Same session: plan files force-staged by the old apply path had to be hand-restored on rollback (`git reset --hard` deletes staged-added files) — plans now never enter the index; parallel workers allocated duplicate memory ID 100 three times in one set, confirming the collision handling route (rename + `log` + `rebuild`, not `supersede`, while duplicate IDs coexist).
