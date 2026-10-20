---
title: Clear vite transform caches after changing a babel plugin before trusting coverage runs
description: `node_modules/.vite`, `node_modules/.vitest-cache`, and `node_modules/.vite-temp` can serve stale transform output from before a plugin change — a green-then-red or unchanged-results coverage run may be measuring the old plugin.
tags: [vite, vitest, cache, babel-plugin, verification]
confirmed: 2026-12-17
---
# Why      A plugin change that alters emitted code (new imports, renamed output) can appear to do nothing under `vp run coverage` because vitest reuses cached transforms keyed on file content, not plugin output. The failure shape is confusing: the same test file passes via a direct `vp test` invocation (fresh transform) but fails under the coverage gate (cached), or identical failure counts before and after the plugin edit.
# Evidence  After wiring feature-import emission into the babel plugin, `vp run coverage dom` still failed identically to the pre-plugin run; `rm -rf node_modules/.vite node_modules/.vitest-cache node_modules/.vite-temp` + re-run flipped the suite. Scoped mid-flight runs (`node ./scripts/bundle.ts <pkg> --quiet && vp test <file>`) also transform fresh — use them to disambiguate cache from code.
