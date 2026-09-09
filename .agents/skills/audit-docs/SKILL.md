---
name: audit-docs
description: >
  Check or grade package documentation (.md/.mdx: docs/ pages, README.md, comparison docs, examples' tutorial.mdx) against `guides/docs.md` — structure, typography, snippets, section conventions — and audit package AGENTS.md file maps for drift (anchors resolve, citations resolve, invariant one-liners match source). Findings are grounded: each a runnable check or a quoted rule, never taste. Use ONLY for rule-grounded review of package docs and package agent files — source → `audit-code`, test files → `audit-tests`, scripts/** → `audit-scripts`, root-level agent files (guides/, skills/, root AGENTS.md) drift → `feedback`, judgment critique → `audit-code` (its cost-gated lenses).
---

# Audit-docs

Review package documentation against `guides/docs.md` and package `AGENTS.md` file maps for drift; report grounded findings. Rules are the source of truth, not taste — an ungrounded finding is out of scope. audit-docs owns **assessment** (what + which rule); `plan` owns the fix contract. Governed by prime.

## Step 1 — Read the rule set (not generic best practice)

- Root AGENTS.md (§Style guides, §Folder structure — the docs-site surface enumeration).
- `guides/docs.md` — a decision procedure: traverse the relevant trees, then tick §Verification Checklist. Tick the checklist, don't reconstruct rules from prose.
- Docs guards as the mechanical floor: `bun doc-links`, `bun lint:structure`, `bun em-dash` (AGENTS.md §Scripts) — findings these already catch are guard failures, not audit findings; this skill targets what they cannot see.

Rule absent for the case at hand → note the gap, don't substitute taste.

## Step 2 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "`bun lint:structure` flags the tutorial: the `### src/app.ts` block diverges from the real file" not "example is stale."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/docs.md` §Typography rewrites em dashes as sentence-broken prose; `css/docs/index.mdx` carries `—` twice."

Neither → taste, drop. Severity (blocker / should-fix / nit) + one clause naming the blast radius (which pages/guards/tutorials it risks).

## Step 3 — Package AGENTS.md file-map drift (when the target includes it)

Compressed prose rots silently — run the mechanical checks:

- **File-map anchors resolve** — for every `file.ts symbol` anchor in the package AGENTS.md: `fd <file> <pkg-root>` finds the file AND `rg -w -q "<symbol>" <file>` exits 0. A miss is a finding (drifted anchor), severity should-fix.
- **Citations resolve** — every `§Name` citation and every skill-name token resolves to a real heading / `.agents/skills/<name>/SKILL.md`. Dangling = finding.
- **Invariant one-liners match source** — AGENTS.md prose describing current behavior ("No try/catch in X", queue orders, timing contracts) spot-checked against the code it describes. Divergence is NOT a rule conflict: it routes to `plan` as a factual fix in the change's blast radius (root AGENTS.md §Skills); report it with the source citation.

Boundary: drift in ROOT-level agent files (root `AGENTS.md`, `guides/`, `.agents/skills/`) is not this skill's target — changes to those are feedback territory, not code changes; route such findings to `feedback`.

## Step 4 — Assess the rules for drift, then report

A `guides/docs.md` rule contradicting current docs reality is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning) routing to `feedback`; never silently work around a stale rule.

Findings grouped by file, severity-sorted (blockers first): rule/check, violation, severity + blast radius. Route actionable findings (BLOCKER/SHOULD-FIX): in-contract — files and behavior inside the executing plan's delta — hand to the worker's redo pass (one pass); scope-expanding findings hand to `plan`. Nothing actionable → say so, stop; a clean audit is valid.

Each finding grounds in a check or a rule, never taste — that is the audit discriminator; see `audit-code`'s worked example for the shape.

Run the prime handoff gate; evaluate the `feedback` trigger table literally — needed rule set absent → `memory`; rule self-contradiction → `feedback` (rule-update proposal).
