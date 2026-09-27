---
type: correction
title: Fresh bun isolated-linker installs are safe — root toolchain imports are declared root devDeps; never cp -rL-repair node_modules
description: Root declares @babel/core, @babel/preset-typescript, @commitlint/types, @types/babel__core — fresh `bun install` in worktrees just works; declare missing deps, never hand-repair node_modules.
tags: [tooling, workers]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [fresh-install-safe, root-devdeps-toolchain, isolated-installer-layout, worktree-bun-install, node-modules-no-repair, declare-dont-repair]
supersedes: 153
---
# Why

153's premise died the day it was written: its "root has no @babel/core" state was replaced hours later by 4366d850 (2026-09-18 10:34), which declares `@babel/core`, `@babel/preset-typescript`, `@commitlint/types`, and `@types/babel__core` as root devDependencies. Under bun's isolated linker only DECLARED edges materialize (169's mechanism, applied to npm deps instead of workspace edges), so with those declarations a stock fresh install resolves every import 153's repair recipe worked around: `scripts/bundle/registry.ts`'s `@babel/core` from root, tsc's `@commitlint/types`/`@babel/core` via root symlinks with @types lookup intact, and `utils/test-helpers.js`'s `@hellajs/*/bundle` via root workspace links. The recipe itself is the hazard now: an agent loading 153 would refuse a legitimate fresh install and `cp -rL` real-dir copies over symlinks — untracked hand-mutation of exactly the layout the linker now maintains correctly. Never edit node_modules by hand; if a root-level import is missing, declare the dependency at the level that imports it and rerun `bun install`.

# Evidence

Read-only probes 2026-09-27 against live worktrees, all seeded by `commandNew`'s plain `bun install` (`.agents/skills/worker/scripts/worktree.mjs`, no linker flag) under bun 1.3.3: both `../hellajs-wt/plans-ui-code-registry-canonical-placeholders` and `../hellajs-wt/plans-agents-config-tdd-evidence` hold stock ISOLATED layouts (`node_modules/.bun` + symlinks). In the ui worktree every package 153 cited is materialized as a root symlink — `@babel/core`, `@commitlint/types`, `@types/babel__core`, `@hellajs/{core,css,dom,resource,router}` — and `packages/ui/dist` artifacts are stamped 19 min post-install, proving the @babel-dependent bundle stage ran to completion on the unmodified install. All links are symlinks, so no `cp -rL` repair was applied: the working state is pure fresh-install output. `git log -S '"@babel/core"' -- package.json` → exactly 4366d850.
