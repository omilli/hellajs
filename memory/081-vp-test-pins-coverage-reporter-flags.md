---
title: "vp test pins vitest coverage reporter flags; diagnose coverage gaps by reading dist"
description: "`vp test` (the vite-plus wrapper) ignores `--coverage.reporter=json/lcov` and `--coverage.reportsDirectory` overrides — no report file lands where requested. To find which function/branch is uncovered, read the built `dist/<file>.js` and count instrumentable functions analytically instead of fighting the flags."
tags: [vp, vitest, coverage, testing, tooling]
confirmed: 2026-11-20
---
# Why

Diagnosing a sub-100% function-coverage row (headless `avatar.js`, factory-gaps unit 02) cost two failed attempts: `--coverage.reporter=json --coverage.reportsDirectory=/tmp/...` and the lcov variant both exited without emitting any report file (the wrapper pins reporter config through the root `vite.config.ts` invocation). The analytic route took one read.

# Facts

1. `./node_modules/.bin/vp test <file> --coverage.reporter=json --coverage.reportsDirectory=<dir>` runs the tests but writes no report to `<dir>` — the reporter/reportsDirectory flags do not survive the wrapper. Same for `lcov`. The coverage tables the scoped `vp run coverage <pkg>` prints are the only sanctioned output.
2. The v8 coverage table OMITS rows for files at 100% across all four metrics; a "missing" row for a file you know exists (check `dist/<file>.js` is present and the totals row's numerator/denominator jumped by its function count) means fully covered, not uninstrumented.
3. The analytic alternative: read `dist/<file>.js`, enumerate instrumentable functions (factory fns, component arrows, template `mark()` callbacks, `forEach` callbacks, prop getters), and map each against the tests' exercised paths. `Object.keys(attrs).forEach((k) => ...)` callbacks are the usual gap — they fire only when a test passes at least one rest-attr member per component instance.

# Gotcha

A dist function-coverage gap of the form `<int>/7` or `<int>/14` with lines+branches at 100% almost always means rest-attr spread callbacks never ran for some component — add attr-forwarding assertions to the existing scenario tests rather than new tests.
