---
type: decision
title: "Bun's coverage table can mark a dist line covered that never executes — probe before trusting the line set"
description: "A bundle line absent from bun's uncovered-lines cell may still be dead — verify with a pre-throw process.stdout.write probe before building contracts on the table's line set."
tags: [testing, coverage]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [phantom-covered-line, coverage-uncovered-set, sourcemap-attribution, dist-bundle-coverage, pre-throw-probe]
---
# Why

Bun's coverage table attributes execution onto sourcemapped dist lines, and the attribution shifts with the loaded module set: a line can flip to covered ONLY under the full test suite while every per-file and partial-suite run reports it uncovered. Plan contracts (and DoD items) that pin exact uncovered-line sets against the table can therefore be falsified by the artifact in either direction — a "missed" scenario may be dead code, and a "covered" line may never run. Before trusting or asserting a line-level coverage claim, instrument the dist bundle: insert `process.stdout.write(...)` IMMEDIATELY BEFORE the suspect line and run the full suite. Two probe mistakes waste round-trips: appending after a `throw` is unreachable (same line, never evaluates), and `console.*` gets patched by test mocks so the signal vanishes — `process.stdout.write` is not mocked. If the probe never fires, the line is dead regardless of the table. Inverse of memory 043 (phantom UNCOVERED brace) and 201 (empty uncovered-lines cell → lcov; supersedes 069, which carried the same workflow): all three are table-artifact modes, not real coverage signals.

# Evidence

Session 2026-09-18, `packages/ui/dist/bundle.js` line 118 (`resolveEntry` no-style throw): full-suite `bun test packages/ui/tests --coverage` reported uncovered `109` only, while the pre-change baseline and every per-file and half-suite run listed `118` uncovered. Three-probe instrumentation settled it: post-throw probe never fires (unreachable), `console.error` probe swallowed (test-patched), `process.stdout.write` probe before the throw never fired in the full suite — the throw never executes in any run shape; the table cell is attribution artifact. Dist restored + `bun bundle ui --quiet` after probing (instrumented dist must never persist).
