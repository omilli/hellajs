---
name: audit
description: >
  Check or grade files against THIS repo's rules (guides/code|tests|docs|scripts.md decision procedures + verification checklists, eslint/tsconfig/bunfig config, the five lint:guards, per-package AGENTS.md file maps) and report grounded findings — each finding a runnable check or a quoted rule, never taste. The enforcement point for structural rules `bun coverage` cannot see (new files, new test helpers). Assess the rules themselves for drift, and offer to hand fixes to `plan`. Use ONLY for rule-grounded review — not for judgment-based critique (→ `critic`), implementing features, or fixing a known bug.
---

# Audit

Review files against this repo's rules; report grounded findings. Rules are the source of truth, not taste — an ungrounded finding is out of scope. Judgment critique (smells with no rule) → `critic`. audit owns **assessment** (what + which rule); `plan` owns the fix contract. Governed by prime.

## Step 1 — Read this repo's rule set (not generic best practice)

- Root AGENTS.md (§Style guides, §Testing, §Non-negotiables) + the target package's `AGENTS.md` file map.
- `guides/code.md` / `guides/tests.md` / `guides/docs.md` / `guides/scripts.md` — decision procedures with verification checklists at the end; tick the checklist, don't reconstruct rules from prose.
- Toolchain config: `eslint.config.*`, `tsconfig*`, `bunfig.toml` (HappyDOM preload).
- The five guards: `bun lint:guards` (visibility, dead-exports, jsdoc-params, doc-links, doc-structure).

§Testing names what `bun coverage` cannot see — this skill is the enforcement point for exactly those: thin wrappers, `lib/internal/` placement criteria, single-callsite extractions, `for…of`/`for…in`, `@internal` visibility, test anti-patterns. Audit is mandatory for new packages, new file structures, and new test helpers (§Testing). Rule absent for the case at hand → note the gap, don't substitute taste.

## Step 2 — Match rules to each file's OWN type

Per-file guide application (§Style guides): `lib/`/`scripts/`/`plugins/` source and config → `guides/code.md`; `*.test.ts` → `guides/tests.md`; `.md`/`.mdx` package docs and tutorials → `guides/docs.md`; `scripts/**`/`utils/**` → `guides/scripts.md`. Read the relevant section, not the whole guide.

## Step 3 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "Fails `bun coverage core` with the uncaught rejection in `parseConfig`" not "type error."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/code.md` §Canonical paths places single-callsite helpers beside their caller; `lib/internal/merge.ts` has one caller and 22 lines."

Neither → taste, drop. Severity (blocker / should-fix / nit) + one clause naming the blast radius (which callers/tests/docs it risks).

## Step 4 — Assess the rules for drift

A rule contradicting current code/config is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning). Never silently work around a stale rule — silent deviation is how rules and code diverge. Distinguish (§Skills): a **rule conflict** routes here; a **codebase-fact drift** — AGENTS.md prose describing behavior the source has outgrown — routes to `plan` as a factual fix in the change's blast radius, not to this skill.

## Step 5 — Report

Findings grouped by file, severity-sorted (blockers first): rule/check, violation, severity + blast radius. Offer to hand actionable findings to `plan` (it derives contracts; audit does not). Nothing actionable → say so, stop; a clean audit is valid.

## Worked example

Illustrative findings on a HellaJS-shaped target. Shows both finding kinds — a runnable check and a quoted rule — plus the drift mechanism via a true repo story. Each finding grounds in a check or a rule, never taste; that is the audit discriminator.

```
packages/store/lib/internal/merge.ts (illustrative target)

SHOULD-FIX
  Rule: `guides/code.md` §Canonical paths — single-callsite helpers under ~30 lines
  live beside their caller, not in `lib/internal/`.
  `merge.ts` has one caller (`lib/update.ts` → applyUpdate) and is 22 lines.
  Blast: misleads navigation — readers expect lib/internal/ to hold multi-file
  implementation units (§Testing names the criterion).

BLOCKER
  Check: `bun coverage store` → exit 1; the rejection path in merge leaves the
  store's subscription set half-updated. Expected exit 0, got 1.
  Blast: every `update()` caller inherits the partial-write window.

Drift mechanism (true story, not synthetic):
  memory/entries/070 recorded that `guides/tests.md`'s phrase "flush the
  microtask queue" was imprecise — `delay()` is ONE microtask hop. The guide now
  reads "drain one microtask hop … NOT sufficient for multi-hop chains"
  (`guides/tests.md` §timing). Drift found → rule-update proposal → guide fixed.
  That loop is Step 4's product.
```

Hand actionable findings (BLOCKER + SHOULD-FIX) to `plan`; the drift proposal routes to `feedback` (it changes a rule, not a codebase fact).

Run the prime handoff gate; friction signals: needed rule set absent → `memory` (recallable fact about this repo's config state); rule self-contradiction → `feedback` (rule-update proposal).
