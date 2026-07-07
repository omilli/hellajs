---
name: brain-audit
description: >
  Check or grade files against the project's OWN rules (lint/style config, tsconfig, test-framework config, guides, CONTRIBUTING, AGENTS.md conventions) and report grounded findings — each finding a runnable check or a quoted rule, never taste. Assess the rules themselves for drift, and offer to hand fixes to `brain-plan`. Use ONLY for rule-grounded review — not for judgment-based critique (→ `brain-critic`), implementing features, or fixing a known bug.
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

## Worked example

Illustrative findings on `src/utils/parse.ts` (synthetic). Shows both finding kinds — a runnable check and a quoted rule — plus a Step 4 drift proposal. Each finding grounds in a check or a rule, never taste; that is the audit discriminator.

```
src/utils/parse.ts

BLOCKER
  Check: `tsc --noEmit` → exit 1, TS2322 at `parseConfig`: string assigned to
  `Config["timeout"]` (number). Expected 0, got 1 error.
  Blast: every caller of `parseConfig` inherits the type hole; `src/api/start.ts`
  already passes a string literal.

SHOULD-FIX
  Rule: `CONTRIBUTING.md#imports` says "one named export per file."
  `parse.ts` exports three (`parseConfig`, `formatConfig`, `validateConfig`).
  Blast: splits the module's surface across the index re-export; no single owner
  for the shape.

Rule-update proposal (drift)
  `guides/code.md#errors` says "throw `Error` subclasses, never bare strings."
  `parseConfig` already throws `ConfigError` (a subclass) and lint passes — the
  guide predates the convention. Proposed edit: replace with "throw the project's
  domain error classes (`src/errors/*`)." Reasoning: the guide contradicts the
  codebase as of this read; silent deviation is how rules rot.
```

Hand actionable findings (BLOCKER + SHOULD-FIX) to `brain-plan`; the drift proposal routes to `brain-feedback` (it changes a rule, not a codebase fact).

Run the brain-prime handoff gate; friction signals: needed rule set absent → `brain-memory` (recallable fact about this repo's config state); rule self-contradiction → `brain-feedback` (rule-update proposal); Step 4 rule drift → `brain-feedback` (already a drift proposal by construction).
