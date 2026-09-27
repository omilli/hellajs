---
type: correction
title: bun 1.3 isolated linker breaks root-level transitive imports on fresh worktree installs — repair via real-dir copies from the .bun store
description: "Fresh bun>=1.3 worktree installs break root-level transitive imports; never rm -rf node_modules — repair with cp -rL copies from .bun store entries to fixpoint (symlinks lose tsc types)."
tags: [tooling, workers]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [isolated-linker, cannot-find-module-fresh-install, worktree-node-modules, rm-rf-node-modules, enoent-reading-node-modules, tsc-symlink-types, bun-1.3-workspaces]
---
# Why
Worktree node_modules is untracked environment: the seeded install predates bun 1.3's isolated-for-workspaces default, and one careless `rm -rf node_modules && bun install` rebuilds it isolated — then `bun coverage <pkg>` fails in stages that look like code errors: (1) bundle stage, `Cannot find module '@babel/core' from scripts/bundle/registry.ts` (root-level transitive import; root has no @babel/core in isolated layout); (2) test stage, `Cannot find module '@hellajs/dom/bundle' from utils/test-helpers.js` (workspace links absent); (3) typecheck stage, TS2307 `@commitlint/types` + TS7016 `@babel/core` (tsc chases symlinks to real store paths and misses the @types lookup). `--linker=hoisted` is NOT the fix: esbuild chases the `babel-plugin-hellajs` workspace symlink into `plugins/babel/node_modules` and ENOENTs there. Hit repairing `../hellajs-wt/plans-ui-code-hellajs-ui` during the primitives-dissolution sweep (2026-09-18).

# Evidence
Sequence verified in `bun coverage ui` logs: hoisted install → `error: ENOENT reading ".../plugins/babel/node_modules/@babel/core"`; default install → `Cannot find module '@babel/core' from .../scripts/bundle/registry.ts` + `Cannot find module '@hellajs/dom/bundle'` + TS2307/TS7016 quartet; after real-dir copies (babel core/preset-typescript + full @babel sibling closure + gensync/ms/json5/debug/semver/@jridgewell/* + yallist + @commitlint/types + @types/babel__core + @hellajs/* workspace links) → `bun coverage ui` exit 0 (262 pass / 0 fail).
