---
type: decision
title: Bun's coverage table renders an EMPTY uncovered-lines cell while %Lines < 100 — get the real line via the lcov reporter, and distrust a stale root coverage/lcov.info
description: bun coverage <100% with an empty uncovered cell → grep DA:0 in lcov; distrust a stale root lcov. A declaration-line zero with covered body is an artifact, not a gap — baseline-compare before hunting.
tags: [testing, coverage, bun, tooling]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [bun-coverage-empty-cell, uncovered-line-not-listed, stale-lcov, coverage-reporter-lcov, function-declaration-zero, phantom-coverage-dip]
---

# Why
Bun's in-test coverage table lists uncovered line numbers only sometimes — observed this session: `% Lines 99.87` with a blank "Uncovered Line #s" cell (router unit 09). Chasing the missing 0.13% through the table alone wastes round-trips; the lcov reporter always carries the exact DA entry. Separately, a repo-root `coverage/lcov.info` can hold sections from an earlier unscoped run (packages/dom + packages/resource alongside router) — parsing it wholesale mis-attributes stale zero-hit lines to the current change (a phantom `buildPath` uncover that the fresh run disproved).

A third failure mode (dom, 2026-09-06): a FRESH lcov can report `DA:<line>,0` on a hoisted `function name(...) {` declaration line while every body line of that function is covered — an instrumentation artifact, not a code gap. The dom bundle has a permanent one: `replaceMismatch` (unique among ~90 instrumented declarations in that bundle). Its effect: adding fully-covered lines shifts the terminal `% Lines` across a rounding boundary — 100.00 → 99.96 — with ZERO new uncovered lines, reading as a coverage regression the diff cannot contain. Triage: a zero on a declaration line with body DA > 0 → artifact; confirm by rebuilding the stashed baseline (`git stash push` → `bun bundle <pkg> --quiet` → re-run lcov) and checking the same zero pre-exists.

# Evidence
Verified empirically 2026-08-29 (router leave-guards unit):
- `bun test packages/router/tests --coverage` → table row `99.87 | ` (empty cell).
- `bun test packages/router/tests --coverage --coverage-reporter=lcov --coverage-dir=.coverage-tmp` → parsing `DA:<line>,0` in the router bundle section yielded exactly `uncovered: 417` (the `runGuardsNested` leave-cancel line — fixed by making a leave-cancel test target a nested route).
- Root `coverage/lcov.info` pre-`rm -rf` contained dom/resource sections and a router line-214 zero-hit that a fresh run did not reproduce; bun did NOT rewrite the root file on the scoped run.
Cleanup: `rm -rf .coverage-tmp` after reading; do not leave the scratch dir behind.

Verified empirically 2026-09-06 (dom fragment-scope-carrier unit):
- With the carrier fix: terminal row `99.53 | 99.96 |` (empty cell); lcov → exactly one zero, `replaceMismatch`'s declaration line, body lines DA 1/19/35/73.
- `git stash push` → rebuild → lcov on the BASELINE tree: the SAME single declaration-line zero — pre-existing, so the 100.00 → 99.96 shift was purely added-covered-lines + rounding, not a regression. Gate (`bun coverage dom`) exited 0 in both trees.
