---
type: decision
title: "Accept small docs length-target overages via operator amendment — never force forbidden trims"
description: When sanctioned trims cannot reach a plan's line-count DoD, surface the gap and accept a residual few-line overage by operator amendment — never force example-block cuts the plan forbids.
tags: [docs, plans, contract]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [docs-length-target, trim-arithmetic, plan-line-dod, overage-acceptance]
---

# Why

Plan units folding a §Length Targets overage into a prose-trim task routinely mis-estimate the sheddable lines (plans/core/audit/docs/03 claimed ~40 compressible lines in a 24-line section; sanctioned sources ceilinged at −12 of the required −17). Forcing the remainder would violate the plan's own constraints ("never example blocks", "the closing sentence stays") or delete load-bearing prose. The set's own index.md already records the precedent: index.mdx at 73 lines vs the 40-70 target, "recorded here and deliberately unplanned". A residual overage of a few lines, recorded, beats a contract violation.

# Evidence

Operator decision 2026-09-10 via relayed dialog during unit 03 execution: DoD amended `-le 250` → `-le 256`, file accepted at 255 lines, residual recorded in the tick and run report. Set precedent: plans/core/audit/docs/index.md header (index.mdx 73 vs 40-70). Constraint quotes: unit 03 Strategy ("never example blocks", closing sentence as cross-reference vehicle).
