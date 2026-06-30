---
name: brain-audit
description: >
  Review, critique, check, or grade files against the project's OWN rules and report grounded findings. For each file, read the matching project rules (lint/style config, tsconfig, test-framework config, guides, CONTRIBUTING, AGENTS.md conventions), ground every finding in a runnable check or a quoted rule, assess the rules themselves for drift, and offer to hand fixes to `brain-plan`. Use ONLY for rule-grounded review — not for implementing features or fixing a known bug.
---

# Audit

Review files against the project's own rules and report grounded findings. The project's rules are the source of truth, not the auditor's taste — a finding with no rule behind it is opinion, and opinion is out of scope here. Judgment-based critique (over-engineering, coupling, naming, code smells with no rule behind them) belongs to `brain-critic`; this skill is its rule-grounded complement. Two non-negotiables govern this skill (see `brain-prime`): rules inviolable (the project's existing conventions govern format; a conflict is a rule-update proposal, not a silent workaround) and full blast radius (a finding's severity accounts for every caller, test, and doc it touches).

brain-audit owns **assessment** — what is wrong and by which rule. `brain-plan` owns **the fix contract**. brain-audit does not write the contract; it hands off grounded findings that let `brain-plan` derive the fix without re-reading every rule.

## Step 1 — Identify the rules that actually govern this repo

Before judging anything, read the repo's real rule set — not generic best practice. Find and read:

- Lint / format config (eslint, biome, ruff, prettier, etc. — whatever is present).
- Type / compile config (tsconfig, pyproject, etc.).
- Test-framework config and any test conventions doc.
- Style / contribution guides (`CONTRIBUTING.md`, `guides/`, an `AGENTS.md` conventions section).
- The public-surface definition (barrel, package entry, module index — whatever defines what callers depend on).

If a rule set the audit needs is absent, note it as a gap rather than substituting taste. A repo with no lint config has no lint findings — say so.

## Step 2 — Classify each target file and read its matching rules

A file is audited against the rules matching its **own** type, not the task that pointed at it:

- Source under `src/`/`lib/`/`app/` → the code/style rules.
- `*.test.*` / spec files → the test rules.
- `*.md` / docs → the docs rules.
- Config (`tsconfig*`, lint config, `package.json`, build files) → code rules plus any config-specific conventions.

Read the relevant rule section, not the whole ruleset, before judging each file.

## Step 3 — Ground every finding

Each finding is one of:

- **A runnable check** — the exact command, the expected output, and the actual. "Fails `tsc --noEmit` with TS2322 at `parseConfig`" not "type error."
- **A quoted rule** — the rule file + section + the rule text verbatim, then what the file does that violates it. "`guides/code.md#imports` says 'one named export per file'; `utils.ts` exports three."

A finding with neither is taste — drop it. State severity (blocker / should-fix / nit) with a one-clause justification that names the blast radius (which callers/tests/docs the issue risks).

## Step 4 — Assess the rules themselves for drift

A rule that contradicts the current code or config is itself a finding — **rule drift**. The codebase may have moved past a stale rule, or the rule may encode an intent the code dropped. Do not silently work around a stale rule; emit a **rule-update proposal** (rule file + section + the quoted rule + the contradiction + the proposed edit with reasoning) for the user to resolve case by case. Silent deviation is how rules and code diverge.

## Step 5 — Report, then offer hand-off

Present findings grouped by file, severity-sorted within each (blockers first). For each: the rule or check, the violation, the severity + blast radius. Then offer to hand the actionable findings to `brain-plan` to scope the fixes — `brain-plan` derives the contracts; brain-audit does not. If nothing is actionable, say so and stop; a clean audit is a valid outcome.

Run the self-improvement track (`brain-prime` handoff gate) before closing. This skill's friction signals: a rule set the audit needed was absent (no lint config → no lint findings), a rule contradicted itself, or Step 4 surfaced rule drift. Rule-drift proposals are feedback events by definition — hand them to `brain-feedback`, not just the user. A confirmed fact about the codebase's conventions, public surface, or test layout is a memory event. Invoke `brain-feedback` (rule change) or `brain-memory` (recallable fact) yourself; do not make the user ask.

## Self-check

a. Is every finding grounded in a runnable check or a quoted rule — no taste?
b. Was each file judged against the rules matching its own type?
c. Did I read the repo's actual rule set before judging, rather than substituting generic best practice?
d. Did I flag rule drift (rule contradicts code) as a rule-update proposal, not a silent workaround?
e. Does every severity rating name its blast radius (callers, tests, docs)?
f. Did I hand fixes to `brain-plan` rather than writing the fix contract myself?
g. Did I route rule drift and friction to `brain-feedback`/`brain-memory` instead of leaving it for the user to invoke?
