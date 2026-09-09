---
type: decision
title: Worktree example installs need bun bundle first and a root bun.lock restore after
description: Fresh worktrees need bun bundle before example builds (dist/ absent); bun install inside examples/ rewrites the root bun.lock, so restore it from the recorded baseline after.
tags: [tooling, worktrees]
timestamp: 2026-02-06
last_confirmed: 2026-02-06
triggers: [worktree-example, astro-build, root-bun-lock]
---

# Why

Two fresh-worktree mechanics bite example work: (1) `packages/*/package.json` exports point at `./dist/*`, which a clean v2 cut lacks (gitignored), so any example whose build resolves `@hellajs/*` (Astro renderer entries import `@hellajs/ssr`/`@hellajs/dom`; `astro-plugin-hellajs`/`vite-plugin-hellajs` resolve to `index.mjs` source and need nothing) fails until `bun bundle` runs at the worktree root. (2) `bun install` executed inside `examples/<name>/` (not a workspace member) walks up to the repo root, re-resolves, and rewrites the ROOT `bun.lock` (observed: added a phantom `"@hellajs/dom": "*"` under plugins/babel's devDependencies + @babel version churn), violating the "no root bun.lock change" expectation example plans carry. The example's own `examples/<name>/bun.lock` is generated correctly either way.

# Evidence

- `packages/dom/package.json` exports: `"import": "./dist/index.js"`; `ls packages/dom/dist` → absent in fresh worktree until `bun bundle` (exit 0, then `astro build` exit 0).
- Root lockfile churn appeared in `worktree.mjs diff` after only `cd examples/astro-islands && bun install`; `git restore --source=<baseline> bun.lock` removed it from the baseline-relative diff and `bun run build` re-verified exit 0 after the restore.
