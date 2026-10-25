---
title: Bundle cache fingerprints pipeline sources but not toolchain versions
description: The per-package build cache hashes package sources plus a pipeline digest (scripts/bundle, scripts/utils, plugins/babel) — but node_modules toolchain versions stay outside, so after a build-tooling version bump run `vp run clean <pkg>` before trusting a rebuild.
tags: [bundle, cache, invalidation, toolchain, stale-dist, verification]
confirmed: 2026-10-25
---
# Why

`scripts/bundle/cache.ts::isCacheValid` compares three things: the package's own file hashes
(`package.json`, `tsconfig.json`, `lib/**`, `registry/**`), the package dir's git status, and a
`pipelineHash` digest over the pipeline's own sources (`scripts/bundle.ts`, `scripts/bundle/**`,
`scripts/utils/**`, `plugins/babel` entry + `src/**`). Repo pipeline edits therefore invalidate
every package cache automatically. What the digest deliberately does NOT cover: installed
toolchain versions (esbuild, tsc, @babel/core, terser — anything under `node_modules`), the same
boundary the package-file hash set already had. A version bump that changes build output leaves
the cache "valid" and ships a stale-looking-but-wrong dist.

# Evidence

Source read 2026-10-25: `scripts/bundle/cache.ts` `calculatePipelineFingerprint()` +
`isCacheValid` compare + `updateCache` write. Empirical same day: appending a comment to
`scripts/bundle/validate.ts` forced a ui rebuild (dist mtime advanced); a second consecutive
`node ./scripts/bundle.ts core --quiet` short-circuited (mtime unchanged); a cache with
`pipelineHash` deleted was treated invalid. Prior gap (cache keyed on package files only, stale
dist after pipeline edits, three occurrences) is fixed by the same change.
