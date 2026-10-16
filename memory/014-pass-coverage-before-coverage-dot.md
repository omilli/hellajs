---
title: Pass --coverage before --coverage dot flags to vp test
description: Nested flags like --coverage.include appearing before --coverage on the vp test command line are silently ignored — the run stays green and renders a repo-wide table.
tags: [discovery, vite-plus, vitest, coverage, cli]
confirmed: 2026-10-16
---
# Why

The vite-plus/vitest CLI applies nested coverage options only when the enabling `--coverage` flag precedes them on the command line. `--coverage.include=...` (and any other `--coverage.*` flag) placed before `--coverage` parses without error and changes nothing: instrumentation falls back to the default include set, so a scoped run quietly reports every workspace it touched (sibling packages near 0%, `bundle.js` rows) with `All files` as a repo-wide total, and the process still exits 0. There is no warning — the only symptom is table scope, which is easy to misread as untested code.

# Evidence

Probes against `./node_modules/.bin/vp test` (vitest 5.0.4) with `--coverage.include=packages/core/dist/*.js` + `dist/internal`: `--coverage` first → table scoped to core's dist rows, exit 0; identical flags with `--coverage` moved after the includes → `bundle.js` row plus css/dom/router/resource sibling rows and `All files` at 12.88% (repo-wide), still exit 0. Caught when rewriting `scripts/coverage.ts` to stock reporting; the fix orders the args `--coverage`, includes/excludes, then `--coverage.reporter=text --coverage.reportOnFailure`, and both scoped and unscoped gates render correctly.
