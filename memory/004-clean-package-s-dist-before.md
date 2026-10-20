---
title: Clean a package's dist before rebuilding after plugin-source edits
description: The bundle cache fingerprints only the target package's own files, so compile-pipeline edits (plugins/babel, plugins/vite, scripts/bundle/**) leave a stale dist — run `vp run clean <pkg>` before trusting a rebuild.
tags: [bundle, cache, plugins, babel, stale-dist, verification]
confirmed: 2026-10-16
---
# Why
`scripts/bundle/cache.ts` hashes only the target package's `package.json`, `tsconfig.json`, `lib/**`, and `registry/**` — the compile pipeline itself (babel plugin source in `plugins/babel/src/**`, vite/rollup wrappers, and `scripts/bundle/**` itself) is not an input. A pipeline edit therefore rebuilds nothing: `vp run bundle <pkg>` exits 0 while `dist/` still reflects the old transform, and tests against that dist silently verify stale behavior (hit twice: a babel JSX-whitespace patch produced zero dist change until `vp run clean ui`; a registry codemod corrupted `scripts/bundle/registry.ts`'s dist tokens retarget and every later `vp run coverage ui` stayed green against the stale dist until an unrelated `lib/` edit invalidated the cache and exposed the red — `vp run clean ui` + rebuild was the reveal).

# Evidence
`scripts/bundle/cache.ts` `getAllSourceFiles()` (core + lib + registry files only); empirical: `rg 'children: \[" Sidebar "\]' packages/ui/dist/registry/sidebar/css/sidebar.js` still matched after patching `plugins/babel/src/processors/children.mjs` and re-running `node ./scripts/bundle.ts ui --quiet`; `vp run clean ui && node ./scripts/bundle.ts ui --quiet` produced `children: ["Sidebar"]`.
