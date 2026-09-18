---
type: decision
title: esbuild externals ride only the bundle build — the per-module build transpiles without --bundle and rejects --external
description: "externalFlags (peerDeps + dependencies) feeds only buildWithEsbuild; the per-module build passes no --bundle, so --external errors there — and its transpile preserves external imports verbatim anyway."
tags: [scripts, bundling]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [esbuild-external, per-module-build, runtime-dependency, dist-externals]
---
# Why

When a package gains a real runtime `dependency` (ui's esbuild in Unit 11), the instinct is to mark it external in EVERY dist build. The per-module build (`buildIndividualModules`) is a pure transpile: no `--bundle` flag, so esbuild errors on `--external` ("Cannot use external without bundle") and the build dies. Externals are also unnecessary there — a non-bundled transpile leaves `import { transformSync } from "esbuild"` verbatim in the output. The external-import guarantee lives in exactly two artifacts: `dist/bundle.js` (via `buildWithEsbuild`'s `--external:` flags) and the per-module file that imports the dependency itself (`dist/internal/strip.js`).

# Evidence

Unit 11 (this session): `bun bundle ui` failed with `✘ [ERROR] Cannot use "external" without "bundle"` after `...externals` was appended to the per-module `buildArgs` in `scripts/bundle/esbuild-build.ts`; removing it (externals confined to `externalFlags` → `buildWithEsbuild`) went green. Verified after: `rg 'from "esbuild"' packages/ui/dist/bundle.js` and `packages/ui/dist/internal/strip.js` both match; bin-path e2e (`add --lang js` through `dist`) exits 0.
