---
name: audit-tests
description: >
  Check or grade test files (*.test.ts) against `guides/tests.md` — framework, imports, structure, assertion patterns, §Anti-Patterns, §Triage & Gate Semantics — and report grounded findings: each a runnable check or a quoted rule, never taste. The enforcement point for test anti-patterns `bun coverage` cannot see (new files, shared test helpers, DOM-access and naming rules). Use ONLY for rule-grounded review of test files — source → `audit-code`, md/mdx and package AGENTS.md → `audit-docs`, scripts/** and utils/** → `audit-scripts`, judgment critique → `audit-code` (its cost-gated lenses).
---

# Audit-tests

Review test files against `guides/tests.md`; report grounded findings. Rules are the source of truth, not taste — an ungrounded finding is out of scope. audit-tests owns **assessment** (what + which rule); `plan` owns the fix contract. Governed by prime.

## Step 1 — Read the rule set (not generic best practice)

- Root AGENTS.md (§Testing — the `bun coverage` gate, never bare `bun test`) + the target package's `AGENTS.md` test sections for context.
- `guides/tests.md` — a decision procedure: §Assertion Patterns through §Code Style, then tick §Verification Checklist. Tick the checklist, don't reconstruct rules from prose.
- `bunfig.toml` (HappyDOM preload) — the runtime tests assume; §Triage & Gate Semantics is the vocabulary for scoped runs and foreign failures, though triage itself is the runner's job, not this skill's product.

`bun coverage` enforces neither the guide's structural rules nor its anti-patterns (§Anti-Patterns) — this skill is the enforcement point for exactly those. Audit is mandatory for new test files and new shared test helpers. Rule absent for the case at hand → note the gap, don't substitute taste.

## Step 2 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "Fails `bun coverage dom` on the multi-hop chain: the assertion runs before the second hop resolves" not "flaky test."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/tests.md` §Code Style requires one behavior per test; `signals.test.ts` `it()` at line of `describe('merge')` asserts both write and subscription effects."

Neither → taste, drop. Severity (blocker / should-fix / nit) + one clause naming the blast radius (which suites/coverage gates it risks).

## Step 3 — Assess the rules for drift

A rule contradicting current test reality is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning); never silently work around a stale rule. The proposal routes to `feedback` (it changes a rule, not a codebase fact).

## Step 4 — Report

Findings grouped by file, severity-sorted (blockers first): rule/check, violation, severity + blast radius. Route actionable findings (BLOCKER/SHOULD-FIX): in-contract — files and behavior inside the executing plan's delta — hand to the worker's redo pass (one pass); scope-expanding findings hand to `plan`. Nothing actionable → say so, stop; a clean audit is valid.

Each finding grounds in a check or a rule, never taste — that is the audit discriminator; see `audit-code`'s worked example for the shape.

Run the prime handoff gate; evaluate the `feedback` trigger table literally — needed rule set absent → `memory`; rule self-contradiction → `feedback` (rule-update proposal).
