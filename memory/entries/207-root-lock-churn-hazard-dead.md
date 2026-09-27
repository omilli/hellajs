---
type: correction
title: The root-lock churn hazard is dead — 4b65a285 committed the plugin resolutions; bun install no longer rewrites bun.lock
description: Since 4b65a285 the committed bun.lock records the plugins' @hellajs/dom resolutions, so root and examples-dir installs leave it clean — the lock-restore ritual is obsolete.
tags: [tooling, worktrees]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [bun-lock-clean, lock-restore-obsolete, worktree-install-noop, stale-lock-fixed]
supersedes: 124
---
# Why

124 (and 138) described a standing hazard: the committed root `bun.lock` lacked the plugin
`@hellajs/dom` resolutions, so ANY `bun install` — root-level or inside a non-workspace
`examples/<name>/` dir — re-resolved and rewrote the lock, and agents were told to
`git checkout HEAD -- bun.lock` after every install. That root cause is fixed: `4b65a285 chore:
babel deps` (2026-09-16) is exactly the root fix 138 predicted ("run `bun install` and commit the
lock"), landing +70/-9 in `bun.lock`. Both install paths now verify clean, so the restore ritual is
obsolete — performing it is wasted work, and reading a dirty-lock rewrite as the old bug mislabels
whatever actually dirtied the file. The surviving worktree truth — a fresh cut has no gitignored
`packages/*/dist`, so run root `bun bundle` before any `@hellajs/*` resolution — lives in 105
(fresh worktrees) and 048 (stale dist after ref switches); this entry deliberately does not restate it.

# Evidence

- `git show --stat 4b65a285`: `bun.lock | 70 ++++++...`, "chore: babel deps", 2026-09-16 — matches
  138's predicted signature (+70/-9 incl. in-range babel patch bumps).
- Current `bun.lock`: `plugins/astro` peerDependencies and `plugins/babel` devDependencies both
  carry `"@hellajs/dom": "*"` (lock lines ~118-141); the resolutions table maps
  `"@hellajs/dom": ["@hellajs/dom@workspace:packages/dom"]` (line ~445).
- Empirical 2026-09-26: root `bun install` → "Checked 557 installs across 664 packages (no
  changes)", `git diff --stat -- bun.lock` empty; `cd examples/astro-islands && bun install` →
  exit 0 with the root lock AND the tracked `examples/astro-islands/bun.lock` both unchanged
  (`git status -sb` silent for both paths).
