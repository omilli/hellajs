---
type: correction
title: Fresh-worktree builds need bun bundle first; the stale committed root bun.lock is rewritten by ANY bun install
description: Clean worktrees lack packages/*/dist (bun bundle first); the committed root bun.lock is stale vs plugins' package.jsons, so ANY bun install rewrites it; restore it, never ship the churn.
tags: [tooling, worktrees]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [stale-bun-lock, bun-lock-rewrite, worktree-seed-install, fresh-worktree-dist]
supersedes: 114
---
# Why

Two fresh-worktree mechanics bite anything that builds or installs (supersedes 114, whose lock half blamed the examples-dir walk-up; the root cause is the stale committed lock, so every install path rewrites it):

1. `packages/*/package.json` exports point at `./dist/*`, which a clean v2 cut lacks (gitignored) — `bun bundle` at the worktree root before example builds, guard runs that typecheck against packages, or any `@hellajs/*` resolution (see 048 for the ref-switch variant).
2. The committed root `bun.lock` is stale against committed `plugins/{babel,astro}/package.json` (they declare `"@hellajs/dom": "*"` devDeps the lock has no resolution for), so ANY `bun install` — the worktree seed's own root-level install, or one run inside a non-workspace `examples/<name>/` dir — re-resolves and rewrites it (observed signature both times: the `@hellajs/dom` devDep map entry added + @babel helper patch churn + new nested resolution blocks). The rewrite is never part of a component's delta: `git checkout HEAD -- bun.lock` (worktrees: restore from the recorded baseline) so baseline-relative diffs and merge commits stay pure; `node_modules` survives the restore, so checks run on.

# Evidence

- `git show HEAD:plugins/astro/package.json` contains `"@hellajs/dom": "*"`; HEAD's `bun.lock` has no `@hellajs/dom` resolution for it.
- `worktree.mjs new plans-ssr-audit-docs` printed "Saved lockfile"; `worktree.mjs diff` then showed the lock rewrite with no edit of any package.json. After `git checkout HEAD -- bun.lock`, `bun em-dash` + `bun doc-links` exited 0 and the lock stayed clean (2026-09-10).
- 114's observation: same rewrite signature after only `cd examples/astro-islands && bun install`; `git restore --source=<baseline> bun.lock` cleared it and `bun run build` re-verified exit 0.
