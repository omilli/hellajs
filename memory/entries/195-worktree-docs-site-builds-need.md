---
type: decision
title: "Worktree docs-site builds need bun bundle + no docs/node_modules/@hellajs shadow"
description: Fresh worktrees ship no packages/*/dist, and a docs-local bun install copies dist-less file: deps over the root symlinks — bun bundle, remove docs/node_modules/@hellajs, then build.
tags: [worktree, docs, build]
timestamp: 2025-09-24
last_confirmed: 2026-09-26
triggers: [worktree-docs-build, astro-build, file-dep-shadow]
---
# Why

`worktree.mjs new` seeds root `node_modules` (workspace `@hellajs/*` symlinks present) but never bundles, so `packages/*/dist` is absent. `docs/package.json` declares `@hellajs/*` as `file:` deps with its own `docs/bun.lock` — running `bun install` inside `docs/` materializes REAL COPIES of those packages under `docs/node_modules/@hellajs/`, and rolldown resolves nearest-first: the dist-less copies shadow the root symlinks and the build dies with "Rolldown failed to resolve import `@hellajs/dom`". The main tree has no `docs/node_modules/@hellajs` at all — its build resolves through the root symlinks into bundled `packages/*/dist`. Matching the main-tree shape is two commands; skipping them costs a failed build and a misread (the error names resolution, not the missing bundle).

# Evidence

2025-09-24 rename session: `cd docs && bun run build` in worktree `plans-docs-docs-rename-components-section-to-ui` failed (exit 1, rolldown resolution of `@hellajs/dom` from `docs/src/pages/ui/collapsible.astro`); `test -d packages/dom/dist` → MISSING in worktree, present in main; `docs/node_modules/@hellajs/dom` contained a full source copy with no `dist/`. After `bun bundle` (exit 0) + `rm -rf docs/node_modules/@hellajs`: build exit 0, 165 pages, pagefind index regenerated. `docs/bun.lock` stayed untouched throughout.
