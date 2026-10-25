---
title: vitest discards console output of passing tests — probe via file write
description: "Under this repo's vitest 5 setup, console.info/log from a PASSING test is not printed by the default reporter (only failing tests' captured stdout shows), so a DOM-behavior probe must persist its findings to a file (or deliberately fail) to be readable."
tags: [vitest, testing, probe, console, debugging]
confirmed: 2026-10-24
---
# Why
A probe test that logs observed DOM behavior and passes shows "Tests 5 passed" with zero output — the probe appears to have learned nothing and gets re-run with mutations to force failure. If ignored, one wasted round-trip per probe; writing `lines` to a scratch file via `node:fs` in `afterAll` (deleted after) makes the dump readable regardless of pass/fail.

# Evidence
packages/dom probe run 2026-10-24: identical probe with failing asserts printed its console lines under "stdout |" blocks; rewritten with passing asserts (or none) the same output vanished from `vp test` output entirely; persisting to a file restored it.
