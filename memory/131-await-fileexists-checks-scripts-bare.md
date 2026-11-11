---
title: Await fileExists checks in scripts - bare calls are always truthy
description: scripts/utils fileExists is async - `if (fileExists(path))` tests a Promise and always passes, silently skipping the guarded branch; await it.
tags: [scripts, utils, fs, async, promise, truthiness]
confirmed: 2026-11-10
---
# Why

`scripts/utils/fs.ts` exports `fileExists` as an async helper (`fs.access` under the hood), so a bare call in a boolean position evaluates the Promise object, which is always truthy. The guarded branch then never runs: an install-if-missing check skipped its `npm install`, and the failure surfaced much later as `vite: not found` (exit 127) inside a downstream webServer command - far from the cause. The pattern generalizes to every async predicate in `scripts/utils/`: check the export's async-ness before using it in `if` conditions, and let lint's strict TS catch floating promises where configured.

# Evidence

`scripts/utils/fs.ts` - `export async function fileExists(filePath: string): Promise<boolean>`. Failing run: reinstall DoD (`rm -rf examples/counter/node_modules` then `vp run e2e counter`) exited 1 with `sh: 1: vite: not found` (exit code 127) and no install line; fixing the check to `if (await fileExists(...))` made the same command print `Installing dependencies for counter...` and exit 0 with 4 passed (2026-11-10).
