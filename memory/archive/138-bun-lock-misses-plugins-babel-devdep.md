---
type: correction
title: Revert provisioning-rewritten bun.lock in worktrees; main-tree lock misses plugins/babel devDep
description: Committed bun.lock lacks plugins/babel's "@hellajs/dom" devDep, so every worktree `bun install` rewrites the lock — revert it, never absorb it into a component commit.
tags: [worktrees, lockfile]
timestamp: 2026-09-09
last_confirmed: 2026-09-09
triggers: [worktree-provisioning, bun-lock-dirty, component-commit-delta]
---
# Why
`plugins/babel/package.json` declares `"@hellajs/dom": "*"` in devDependencies (committed), but committed `bun.lock` records it only under the astro plugin's peerDependencies — the devDep entry is absent. `worktree.mjs new` runs a non-frozen `bun install`, which resolves the declared-but-unrecorded dep and rewrites `bun.lock` (+70/-9 incl. in-range babel patch bumps). A worker leaving it dirty leaks lockfile churn into the merge runner's component commit; "absorbing" it is off-plan noise.

# Evidence
- `plugins/babel/package.json` devDependencies contains `"@hellajs/dom": "*"` (line 37 at HEAD 64409493).
- `git grep '"@hellajs/dom": "\*"' HEAD -- bun.lock` → only the astro plugin peerDependencies block.
- Worktree `plans-dom-audit-tests` provisioning left `bun.lock` modified (+70/-9); `git checkout -- bun.lock` restored a clean 5-file component delta; `bun coverage dom` stayed green after the revert.
- Root fix is main-tree only: run `bun install` and commit the lock — user territory (commits are user-only).
