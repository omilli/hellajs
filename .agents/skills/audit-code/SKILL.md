---
name: audit-code
description: >
  Check or grade source and config files (.ts/.tsx/.mjs under lib/ or plugins src, tsconfig*, eslint.config.*, package.json) against `guides/code.md` — decision trees, canonical paths, JSDoc, file structure — and report grounded findings: each a runnable check or a quoted rule, never taste. The enforcement point for structural rules `bun coverage` cannot see (thin-wrapper ban, lib/internal/ placement, single-callsite extraction, @internal visibility). Use ONLY for rule-grounded review of code files — test files → `audit-tests`, md/mdx and package AGENTS.md → `audit-docs`, scripts/** and utils/** → `audit-scripts`, judgment critique with no rule behind it → `critic`.
---

# Audit-code

Review source and config files against `guides/code.md`; report grounded findings. Rules are the source of truth, not taste — an ungrounded finding is out of scope. audit-code owns **assessment** (what + which rule); `plan` owns the fix contract. Governed by prime.

## Step 1 — Read the rule set (not generic best practice)

- Root AGENTS.md (§Style guides, §Non-negotiables) + the target package's `AGENTS.md` file map for context — the file map's own drift belongs to `audit-docs`, not here.
- `guides/code.md` — a decision procedure: traverse the trees, then tick §Verification Checklist (§Config Verification Checklist for config files). Tick the checklist, don't reconstruct rules from prose.
- Toolchain config as applicable: `eslint.config.*`, `tsconfig*`.

`bun coverage` enforces neither the guide's structural rules nor their anti-patterns — this skill is the enforcement point for exactly those. Audit is mandatory for new packages and new file structures. Rule absent for the case at hand → note the gap, don't substitute taste.

## Step 2 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "Fails `bun coverage core` with the uncaught rejection in `parseConfig`" not "type error."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/code.md` §Canonical paths places single-callsite helpers beside their caller; `lib/internal/merge.ts` has one caller and 22 lines."

Neither → taste, drop. Severity (blocker / should-fix / nit) + one clause naming the blast radius (which callers/tests/docs it risks).

## Step 3 — Assess the rules for drift

A rule contradicting current code/config is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning); never silently work around a stale rule. The proposal routes to `feedback` (it changes a rule, not a codebase fact). Boundary: AGENTS.md prose outgrown by source is a codebase-fact drift, not rule drift — it routes to `plan` as a factual fix; `audit-docs` owns detecting it.

## Step 4 — Report

Findings grouped by file, severity-sorted (blockers first): rule/check, violation, severity + blast radius. Route actionable findings (BLOCKER/SHOULD-FIX): in-contract — files and behavior inside the executing plan's delta — hand to the worker's redo pass (one pass); scope-expanding findings hand to `plan`. Nothing actionable → say so, stop; a clean audit is valid.

## Worked example

Illustrative findings on a HellaJS-shaped target — both finding kinds plus the drift mechanism via a true repo story. Each finding grounds in a check or a rule, never taste; that is the audit discriminator.

```
packages/store/lib/internal/merge.ts (illustrative target)

SHOULD-FIX
  Rule: `guides/code.md` §Canonical paths — single-callsite helpers under ~30 lines
  live beside their caller, not in `lib/internal/`.
  `merge.ts` has one caller (`lib/update.ts` → applyUpdate) and is 22 lines.
  Blast: misleads navigation — readers expect lib/internal/ to hold multi-file
  implementation units.

BLOCKER
  Check: `bun coverage store` → exit 1; the rejection path in merge leaves the
  subscription set half-updated. Expected exit 0, got 1.
  Blast: every `update()` caller inherits the partial-write window.

Drift mechanism (true story): memory/entries/070 recorded that
  `guides/tests.md`'s phrase "flush the microtask queue" was imprecise —
  `delay()` is ONE microtask hop. The guide now reads "drain one microtask hop
  … NOT sufficient for multi-hop chains". Drift found → rule-update proposal →
  guide fixed. That loop is Step 3's product.
```

Route actionable findings: in-contract → the worker's redo pass; scope-expanding → `plan`. The rule-drift proposal routes to `feedback` (it changes a rule, not a codebase fact).

Run the prime handoff gate; evaluate the `feedback` trigger table literally — needed rule set absent → `memory` (recallable fact about this repo's config state); rule self-contradiction → `feedback` (rule-update proposal).
