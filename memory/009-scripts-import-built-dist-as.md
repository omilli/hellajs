---
title: Scripts import built dist as .js but sibling utils as .ts under strip-types node
description: "Under `node ./scripts/*.ts` (strip-types), imports of built workspace output must keep the `.js` extension (`../packages/ui/dist/index.js`) while sibling script utils use source `.ts` (`./utils/index.ts`) — a blanket .js-to-.ts import rewrite breaks every dist import."
tags: [scripts, imports, strip-types, dist, node, docs-ui]
confirmed: 2026-10-16
---
# Why

Scripts run as raw TypeScript source, so relative imports resolve against real files: `scripts/utils/` ships only `.ts` (correct to import as `.ts`), while `packages/*/dist/` is built esbuild output whose files are `.js` — `dist/index.ts` does not exist, and ESM resolution under node is exact-extension, so `vp run docs-ui` dies with `ERR_MODULE_NOT_FOUND` before doing anything. Bun papered over this class of mismatch (it rewrites extensions); node does not.

# Evidence

2026-10-16: `vp run docs-ui button` failed with `Cannot find module '.../packages/ui/dist/index.ts'`; `ls packages/ui/dist` shows `index.js` (no `.ts`); reverting that one import to `dist/index.js` (baseline + main-tree form) while keeping `./utils/index.ts` made the regen exit 0. `scripts/utils/` contains only `.ts` files. The `.ts` dist rewrite was unauthorized drift.
