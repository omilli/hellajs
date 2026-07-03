---
name: brain-audit
description: >
  Review, critique, check, or grade files against the project's OWN rules and report grounded findings. For each file, read the matching project rules (lint/style config, tsconfig, test-framework config, guides, CONTRIBUTING, AGENTS.md conventions), ground every finding in a runnable check or a quoted rule, assess the rules themselves for drift, and offer to hand fixes to `brain-plan`. Use ONLY for rule-grounded review — not for implementing features or fixing a known bug.
---

# Audit

Review files against the project's own rules; report grounded findings. Rules are the source of truth, not taste — an ungrounded finding is out of scope. Judgment critique (smells with no rule) → `brain-critic`. brain-audit owns **assessment** (what + which rule); `brain-plan` owns the fix contract. Governed by brain-prime.

## Step 1 — Read the repo's real rule set (not generic best practice)

- Lint/format config (eslint, biome, ruff, prettier, etc.).
- Type/compile config (tsconfig, pyproject, etc.).
- Test-framework config + conventions doc.
- Style/contribution guides (`CONTRIBUTING.md`, `guides/`, `AGENTS.md` conventions).
- Public-surface definition (barrel, package entry, module index).

Absent rule set → note the gap, don't substitute taste. No lint config → no lint findings; say so.

## Step 2 — Match rules to each file's OWN type

- Source under `src/`/`lib/`/`app/` → code/style rules.
- `*.test.*`/spec → test rules.
- `*.md`/docs → docs rules.
- Config (`tsconfig*`, lint, `package.json`, build) → code + config conventions.

Read the relevant section, not the whole ruleset.

## Step 3 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "Fails `tsc --noEmit` with TS2322 at `parseConfig`" not "type error."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/code.md#imports` says 'one named export per file'; `utils.ts` exports three."

Neither → taste, drop. Severity (blocker / should-fix / nit) + one clause naming the blast radius (which callers/tests/docs it risks).

## Step 4 — Assess the rules for drift

A rule contradicting current code/config is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning). Never silently work around a stale rule — silent deviation is how rules and code diverge.

## Step 5 — Report

Findings grouped by file, severity-sorted (blockers first): rule/check, violation, severity + blast radius. Offer to hand actionable findings to `brain-plan` (it derives contracts; audit does not). Nothing actionable → say so, stop; a clean audit is valid.

Run the brain-prime handoff gate; friction signals: needed rule set absent, rule self-contradiction, or Step 4 rule drift (drift proposals are feedback events → `brain-feedback`).
