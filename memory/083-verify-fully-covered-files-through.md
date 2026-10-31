---
title: Verify fully-covered files through coverage totals, not text-table rows
description: "Vitest's text coverage reporter omits 100%-covered files from the per-file table — a newly added fully-covered file is invisible there, so verify instrumentation via the summary totals delta or the dist import check, never by row presence."
tags: [discovery, coverage, vitest, verification, false-alarm]
confirmed: 2026-10-31
---
# Why

The per-file coverage table is not an inventory: vitest's v8 text reporter elides every file sitting at 100% across all four columns (statements/branches/functions/lines), and the repo sets no `skipFull` override. A new internal file that the tests fully exercise therefore never appears as a row — reading its absence as "uninstrumented" or "dropped by the bundle" produces a false alarm and a wasted round-trip. The same trap makes "my new file isn't listed" indistinguishable from "my file isn't built" by table inspection alone.

# Evidence

Scoped `vp run coverage headless` (2026-10-31): every listed row carries at least one metric below 100 (`exitMachine.js` 100/90.9, `onDoubleTap.js` 100/95.65, `trapFocus.js` 100/85.71), while fully-covered files (`focusables.js`, `internal/press.js`, `reset.js`, and a newly added 100%-covered internal module) are absent from the table though present in `packages/headless/dist/internal/`. No `skipFull` anywhere in `vite.config.ts` or `scripts/coverage.ts` (reporter set at `--coverage.reporter=text`). Instrumentation proof without the table: the summary's covered-function total increments by exactly the new module's exported functions, and the importing dist module's import line references the new `dist/internal/<file>.js`.
