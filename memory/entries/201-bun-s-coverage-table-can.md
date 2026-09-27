---
type: correction
title: Bun's coverage table can render an EMPTY uncovered-lines cell while %Lines < 100 — get the real line via the lcov reporter, distrust a stale root coverage/lcov.info, and treat a declaration-line DA:0 with a covered body as a suspect artifact (baseline-compare, never assume permanent)
description: bun coverage <100% with empty uncovered cell → grep DA:0 in lcov; distrust a stale root lcov. A declaration-line zero with covered body is an artifact suspect — baseline-compare it.
tags: [testing, coverage, bun, tooling]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [bun-coverage-empty-cell, uncovered-line-not-listed, stale-lcov, coverage-reporter-lcov, function-declaration-zero, phantom-coverage-dip]
supersedes: 069
---
# Why
Bun's in-test coverage table lists uncovered line numbers only sometimes — observed: `% Lines 99.87` with a blank "Uncovered Line #s" cell (router unit 09, 2026-08-29). Chasing the missing % through the table alone wastes round-trips; the lcov reporter always carries the exact DA entry. Note the reporter split: `--coverage-reporter=lcov` suppresses the summary table entirely, so the two surfaces never corroborate each other in one run. Separately, a repo-root `coverage/lcov.info` holds sections from whatever ran last into the default dir — parsing it wholesale mis-attributes stale zero-hit lines to the current change (a phantom `buildPath` uncover that the fresh run disproved).

The 069 entry claimed the dom bundle had a PERMANENT declaration-line zero at `replaceMismatch`. Falsified 2026-09-26: a fresh run shows `DA:1092,37` — the declaration line is covered, and all 23 current dom-bundle zeros are genuine uncovered branch bodies. The artifact class is still real (it was reproduced on the 2026-09-06 tree and confirmed pre-existing via baseline compare), but it is build-and-tree-specific, not permanent: bun's line attribution on hoisted `function name(...) {` declarations shifts as tests and bundles evolve. Triage stands: a zero on a declaration line with body DA > 0 → artifact suspect; confirm by rebuilding the stashed baseline (`git stash push` → `bun bundle <pkg> --quiet` → re-run lcov) and checking the same zero pre-exists. Never record a specific line as a fixture.

# Evidence
Re-verified 2026-09-26 against bun 1.3.3:
- `bun bundle dom --quiet && bun test packages/dom/tests --coverage --coverage-reporter=lcov --coverage-dir=.coverage-tmp` → 526 tests, 0 fail; DA parsing clean; no summary table printed (reporter split confirmed).
- `replaceMismatch` decl at `packages/dom/dist/bundle.js:1092` → `DA:1092,37` (covered); body lines 1093–1096 DA 77/41/52/2. Current zeros (102, 458–459, 1030–1048, 2895) are all real branch gaps, none on declaration lines.
- Root `coverage/lcov.info`: dated 2026-09-18, single `SF:packages/ui/dist/bundle.js` section, while `packages/dom/dist/` was rebuilt 2026-09-24 — parsing it wholesale mis-attributes. bun did not rewrite the root file on a scoped run.
- Original observations (2026-08-29 router: empty cell + lcov `DA:417,0` → `runGuardsNested` leave-cancel; 2026-09-06 dom: decl-line zero on `replaceMismatch`, baseline-compare confirmed pre-existing) — historical, recorded in superseded entry 069.
Cleanup: `rm -rf .coverage-tmp` after reading; do not leave the scratch dir behind.
