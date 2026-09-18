---
type: decision
title: "Bundle cache invalidation is content hashes + git status — an untracked (worktree-standing) package has constant `?? pkg/` status, so ONLY hash-set membership in getAllSourceFiles invalidates; every new source dir a build reads must join it"
description: "Bundle-cache invalidation is hashes (getAllSourceFiles) + git status; untracked packages have constant status, so every source dir a build reads must join the hash set — registry/** since Unit 4."
tags: [tooling, build, cache, worktrees]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [build-cache-invalidation, getallsourcefiles, untracked-package-cache, stale-dist-registry, bundle-cache-hash-set]
---

# Why

`isCacheValid` short-circuits a build when hashes match AND git status is unchanged. For a package added inside a component worktree (everything untracked until merge), `git status --porcelain <pkg>` is the constant `?? pkg/` line regardless of edits — the git-status signal can never fire. The only working invalidator is the content-hash set, so when a build step reads a new source directory (e.g. the ui registry compile reads `registry/**`), that directory MUST join `getAllSourceFiles` or edits silently keep the cached build and `dist/` drifts from source. Unit 4's plan asserted the cache already covered `registry/` — false until fixed: the hash set was package.json + tsconfig.json + `lib/**` only, and Units 06-08 (registry-only edits) would have bundled stale `dist/registry`.

# Evidence

- `scripts/bundle/cache.ts` `getAllSourceFiles`: coreFiles (package.json, tsconfig.json) + `scanDirRecursive(libDir, /\.(ts|tsx|js|jsx)$/)`; `getGitStatus` runs `git status --porcelain <pkg>`.
- Worktree probe pre-fix: appended a marker line to `packages/ui/registry/theme/theme.css` → `bun bundle ui` hit the cache, `dist/registry/theme/theme.css` unchanged.
- Post-fix (registry glob added): same edit → recompiled with the marker; revert → recompiled clean, dist byte-matches source; `jq '.hashes | keys'` lists all 7 registry files.
