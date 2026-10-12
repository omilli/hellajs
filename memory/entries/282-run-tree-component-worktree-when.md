---
type: decision
title: Run in-tree, not in a component worktree, when the user's uncommitted main-tree edits overlap the sweep's target lines
description: A worktree cut from the clean base omits the user's in-flight edits, so the same-line delta collides at `bun merge`; ask, then build on their edits in-tree.
tags: [worktree, protocol]
timestamp: 2026-10-10
last_confirmed: 2026-10-10
triggers: [worktree-route-overlap, uncommitted-user-edits, merge-collision, in-tree-sweep, plan-file-run]
---
# Why
Component worktrees seed clean from the base commit (see 099), so any uncommitted user edits in the main tree are absent from the worktree copy. When those edits touch the very lines a planned sweep retargets, the worktree's delta and the user's edits collide at the merge checkpoint: the runner applies the component delta onto a tree whose same lines are already locally modified. The user is the arbiter: surface the overlap, recommend the in-tree route (their edits are usually the same task started by hand, target-state-identical), and only proceed after an explicit choice.

# Evidence
Session 2026-10-10: the ui slot-default-column sweep (plans/ui/docs/slot-default-column) found the user had already hand-blanked six children rows in accordion.mdx/alert.mdx (uncommitted, matching the target state exactly). `ask_user_question` returned "In-tree (Recommended)"; the sweep then ran in-tree, the user's rows counted as done (probes passed over them unchanged), and their unrelated demo .tsx edits stayed untouched. Zero merge ceremony needed.
