---
type: decision
title: "Worktree docs-site builds need bun bundle + no docs/node_modules/@hellajs shadow"
description: Fresh worktrees ship no packages/*/dist; docs builds need the dist set of every package in the page graph — wiring the astro renderer adds ssr — plus no docs/node_modules/@hellajs shadow.
tags: [worktree, docs, build]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [worktree-docs-build, astro-build, file-dep-shadow]
---
# Why

`worktree.mjs new` seeds root `node_modules` (workspace `@hellajs/*` symlinks present) but never bundles, so `packages/*/dist` is absent. `docs/package.json` declares no `@hellajs/*` (runtime imports resolve via root walk-up), so keep `docs/node_modules/@hellajs` absent — a docs-local install that materializes copies there shadows the root symlinks and the build dies with "Rolldown failed to resolve import `@hellajs/dom`". Bundle every package in the unit's page-import graph, not a fixed list: baseline pages need core/dom/css/ui, but wiring the astro renderer (`hellajs()` integration + any `client:*` island) pulls the plugin's `server.mjs` → `@hellajs/ssr` into the graph — a baseline build never loads it, so the failure surfaces only after the island unit lands (exit 1, `Rolldown failed to resolve import "@hellajs/ssr" from "plugins/astro/server.mjs"`).

# Evidence

2026-10-02, unit 01 of plans/docs/misc/demo-pipeline (worktree `plans-docs-misc-demo-pipeline`): bootstrap bundled core/dom/css/ui per the then-current recipe; baseline `astro build` exit 0 (no renderer usage); after wiring `hellajs()` + `client:load` islands, build exit 1 with `Rolldown failed to resolve import "@hellajs/ssr" from "plugins/astro/server.mjs"`; `bun bundle ssr` alone fixed it (exit 0, 181 pages). `docs/node_modules/@hellajs` checked absent post-install; `docs/bun.lock` untouched across all four builds. Original evidence: 2025-09-24 rename session, worktree `plans-docs-docs-rename-components-section-to-ui` — dist-less `file:` copies under `docs/node_modules/@hellajs` shadowed root symlinks; bundle + `rm -rf docs/node_modules/@hellajs` fixed (docs/package.json has since dropped the `file:` deps).
