---
type: decision
title: Build all packages once in a fresh component worktree before any scoped bundle or dist-dependent check
description: A fresh worktree has no packages/*/dist and `bun bundle <pkg>` skips dependency packages, so scoped builds fail on unresolved @hellajs/* modules until root `bun bundle` runs once.
tags: [worktrees, build, verification]
timestamp: 2026-09-20
last_confirmed: 2026-09-20
triggers: [worktree-bundle-deps, scoped-bundle-fresh-worktree, baseline-red-missing-dist, bundle-store-tsc-2307]
---

# Why

worktree.mjs seeds a clean cut plus `bun install`; it does not build bundles. Workspace resolution of `@hellajs/<dep>` goes through each package's `exports` → `dist/`, which is gitignored. `bun bundle <pkg>` builds only the named package, so its tsc declaration pass fails with `TS2307: Cannot find module '@hellajs/core'` plus cascading unknown-type errors in unrelated files — which reads exactly like an inherited red baseline ("stop and report") but is provisioning state, not code breakage.

# Evidence

2026-09-20, worktree plans-store-code-store-audit-06: `bun bundle store --quiet` failed (`core.ts(1,108): TS2307 Cannot find module '@hellajs/core'`, then TS2345/TS18047/TS7006 cascade in create.ts/utils.ts/persist.ts). One root `bun bundle --quiet` ("All packages built successfully") made the same scoped command exit 0 and 147/147 store tests pass. Distinct from memory 048 (stale dist after a ref switch, examples scope) and 099 (seeding mechanics).
