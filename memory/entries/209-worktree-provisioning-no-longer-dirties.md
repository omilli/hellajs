---
type: correction
title: Worktree provisioning no longer dirties bun.lock; do not reflexively revert it
description: Committed bun.lock now records plugins/babel's @hellajs/dom devDep, so provisioning installs converge clean; revert only genuine unplanned lock churn.
tags: [worktrees, lockfile]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [worktree-provisioning, bun-lock-dirty, component-commit-delta]
supersedes: 138
---
# Why

The old mismatch (babel's declared `@hellajs/dom` devDep absent from the lock, making every worktree `bun install` rewrite it) was fixed in the main tree: the committed lock now records the devDep. Following the retired "always `git checkout -- bun.lock` after provisioning" rule is now pointless ceremony and, worse, would discard legitimate lock updates if any work ever needs one. If provisioning churn ever reappears, the cause is again a declared-but-unrecorded dep; the root fix stays main-tree `bun install` + commit (user-only — never absorb lock churn into a component commit).

# Evidence

- `git grep '"@hellajs/dom": "\*"' HEAD -- bun.lock` → two matches: astro peerDependencies (line 122) and `plugins/babel` devDependencies (line 137; babel block HEAD:127-140).
- `plugins/babel/package.json` devDependencies still declares `"@hellajs/dom": "*"` — package and lock now agree.
- Working tree `bun.lock` clean (`git status -sb -- bun.lock` → empty).
- Provisioning still runs a non-frozen `bun install` (`.agents/skills/worker/scripts/worktree.mjs:230`), so a future package/lock divergence would dirty the lock again — the hazard, not the workaround, is the durable fact.
