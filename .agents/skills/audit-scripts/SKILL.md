---
name: audit-scripts
description: >
  Check or grade build tooling and CI automation (scripts/**, utils/**) against `guides/scripts.md` — thin CLI entries, one concern per file, shared utils, arg conventions, dependency graphs — and audit scripts/AGENTS.md file maps for drift (anchors resolve, table rows match real files). Findings are grounded: each a runnable check or a quoted rule, never taste. Separate from package audit runs — package sections never invoke this skill. Use ONLY for rule-grounded review of scripts — source → `audit-code`, test files → `audit-tests`, md/mdx → `audit-docs`, judgment critique → `audit-code` (its cost-gated lenses).
---

# Audit-scripts

Review build tooling against `guides/scripts.md`; report grounded findings. Rules are the source of truth, not taste — an ungrounded finding is out of scope. audit-scripts owns **assessment** (what + which rule); `plan` owns the fix contract. Governed by prime. This skill is separate from package audit runs — it targets the build system, not `packages/*` surfaces.

## Step 1 — Read the rule set (not generic best practice)

- Root AGENTS.md §Scripts (the command table) + `scripts/AGENTS.md` (module maps, pipelines, the arg-parse duplication note).
- `guides/scripts.md` — a decision procedure: §Decision Precedence, §Canonical paths, the file-structure tree, then tick §Verification Checklist. Tick the checklist, don't reconstruct rules from prose.
- Style shared with `guides/code.md` (§Style (shared with code.md)) — code-guide rules apply to script source; this skill is their enforcement point here.

Scripts carry no dedicated test suite (`scripts/AGENTS.md` §Testing) — `bun lint` plus the guards are the mechanical floor; this skill targets what they cannot see. Rule absent for the case at hand → note the gap, don't substitute taste.

## Step 2 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "`bun audits core --dry-run` exits 1 on a valid package" not "arg parsing broken."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/scripts.md` §Canonical paths places shared logic in `scripts/utils/`; `coverage.ts` re-implements `execCommand` inline."

Neither → taste, drop. Severity (blocker / should-fix / nit) + one clause naming the blast radius (which entries/pipelines/CI it risks).

## Step 3 — scripts/AGENTS.md file-map drift (when the target includes it)

Compressed prose rots silently — run the mechanical checks:

- **Table rows resolve** — every script/module row in `scripts/AGENTS.md` names a file that `fd <file> scripts/` finds, and the row's symbol/flag claims hold against it (`rg -w -q "<symbol>" <file>` exits 0). A miss is a finding (drifted row), severity should-fix.
- **Citations resolve** — every `§Name` citation resolves to a real heading in the named file. Dangling = finding.
- **Invariant one-liners match source** — prose describing current behavior (queue orders, retry counts, which runner invokes what) spot-checked against the code it describes. Divergence is NOT a rule conflict: it routes to `plan` as a factual fix; report it with the source citation.

Boundary: drift in ROOT-level agent files (root `AGENTS.md`, `guides/`, `.agents/skills/`) is feedback territory, not code changes; route such findings to `feedback`.

## Step 4 — Assess the rules for drift, then report

A `guides/scripts.md` rule contradicting current script reality is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning) routing to `feedback`; never silently work around a stale rule.

Findings grouped by file, severity-sorted (blockers first): rule/check, violation, severity + blast radius. Route every finding — severity orders the report, never filters routing: in-contract — files and behavior inside the executing plan's delta — hand to the worker's redo pass (one pass); scope-expanding findings hand to `plan`, nits batched into one sweep unit rather than one unit each. Zero findings → say so, stop; a clean audit is valid.

Each finding grounds in a check or a rule, never taste — that is the audit discriminator; see `audit-code`'s worked example for the shape.

Run the prime handoff gate; evaluate the `feedback` trigger table literally — needed rule set absent → `memory`; rule self-contradiction → `feedback` (rule-update proposal).
