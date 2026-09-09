---
name: audit-code
description: >
  Check or grade source and config files (.ts/.tsx/.mjs under lib/ or plugins src, tsconfig*, eslint.config.*, package.json) against `guides/code.md` — decision trees, canonical paths, JSDoc, file structure — and judge them for what no rule reaches: over-engineering, complexity and coupling, dead or duplicate code, misleading naming or file layout, API/interface design, correctness smells. Findings are grounded: a runnable check or a quoted rule; judgment findings pass the cost gate — one named cost (breaks/hampers/misleads/bloats), source cited this session. The enforcement point for structural rules `bun coverage` cannot see (thin-wrapper ban, lib/internal/ placement, single-callsite extraction, @internal visibility). Use when asked to audit, check, grade, review, or critique code or a code diff, flag smells or over-engineering, or assess API/interface design. Use ONLY for code files — test files → `audit-tests`, md/mdx and package AGENTS.md → `audit-docs`, scripts/** and utils/** → `audit-scripts`.
---

# Audit-code

Two tracks over the same code, one findings report: the **rule audit** (assessment against `guides/code.md` — what + which rule) and the **judgment critique** (taste no rule reaches, held to the cost gate). Rules are the source of truth, not taste — an ungrounded finding is out of scope on both tracks. audit-code owns **diagnosis**; `plan` owns the fix contract. Governed by prime.

## Step 1 — Read rules, target, and neighborhood

- Rule set (not generic best practice): root AGENTS.md (§Style guides, §Non-negotiables) + the target package's `AGENTS.md` file map for context — the file map's own drift belongs to `audit-docs`, not here. `guides/code.md` is a decision procedure: traverse the trees, then tick §Verification Checklist (§Config Verification Checklist for config files). Toolchain config as applicable: `eslint.config.*`, `tsconfig*`.
- Target: the files named by the invocation, or a changeset (`HEAD`, branch, PR/diff — audit what changed, in context). Read in its neighborhood — a smell is rarely visible in isolation: target files in full (bounded slices if large; truncated reads → wrong conclusions); imports and immediate neighbors, both directions; callers — repo-wide `rg` for every importer of the target's symbols (dead-code and coupling findings stand or fall on this); surface arbiters — `packages/<pkg>/lib/index.ts` barrel and dom's typed-surface mirror (`lib/types/nodes.d.ts` + `lib/types/attributes.d.ts`, §Non-negotiables), whose blast radius includes every importer; stated intent — package `AGENTS.md` + `guides/` separate intentional design from smell; `{pkg}-comparison.md` is a published behavior contract.

`bun coverage` enforces neither the guide's structural rules nor their anti-patterns — this skill is the enforcement point for exactly those. Audit is mandatory for new packages and new file structures. Rule absent for the case at hand → note the gap, don't substitute taste.

## Step 2 — Ground every finding

Each finding is exactly one of:

- **A runnable check** — exact command, expected, actual. "Fails `bun coverage core` with the uncaught rejection in `parseConfig`" not "type error."
- **A quoted rule** — file + section + rule verbatim + the violation. "`guides/code.md` §Canonical paths places single-callsite helpers beside their caller; `lib/internal/merge.ts` has one caller and 22 lines."
- **A cost-gated judgment** — a smell no rule reaches, paying its way with exactly one named cost:
  - **Breaks** — bug, crash, race, data loss, security hole, wrong output for a concrete input. Correctness smells live here.
  - **Hampers** — change A forces unrelated changes B and C: tight coupling, leaky abstraction, god-object, speculative generality.
  - **Misleads** — name/type/path that makes a reader guess wrong about behavior or location.
  - **Bloats** — unreachable code, unused surface, near-duplicate blocks with drift risk.

A smell that fits a check or a rule is a finding of that kind, not a judgment. Neither rule nor cost → taste, drop; "I'd write it differently" is not a finding. Silence is valid — manufacturing findings to seem thorough is the failure mode.

## Step 3 — Apply the judgment lenses

Run the lenses when the invocation asks for critique or the audited delta touches a public surface (Surface:yes); internal-only rule audits skip them. Each lens carries the test separating a real finding from noise:

- **Over-engineering** — abstraction with no second caller *today*; config/flags/indirection "for the future"; generic solver where one concrete case exists. Test: paying for itself right now? Speculative generality = Hampers.
- **Complexity & coupling** — deep nesting, god-objects, leaky abstractions, circular deps, change-one-break-many. Test: can a reasonable change land in one place without design-forced ripple? Forced ripple = Hampers.
- **Dead & duplicate code** — unreachable branches, unused exports, empty/swallowed handlers, near-identical blocks with drift risk. Test: does `rg` find a caller (dead) or 2+ drifting copies (duplicate)? Unverifiable → dropped. (`bun dead-exports` guards exports — this lens owns the unexported interior.)
- **Naming & file layout** — names that lie about behavior; types/paths contradicting the role. Test: would a new contributor guess wrong from name/path? Yes = Misleads. `guides/code.md` §Canonical paths is the arbiter; pure convention breaks are quoted-rule findings.
- **API & interface design** — param names, order, types, optionality, return shape, arity, and the contract a caller must learn. Test: could a caller use it correctly from the signature alone? Hides a requirement, contradicts the name, demands out-of-band knowledge, or forces an awkward call shape = Misleads or Hampers.
- **Correctness smells** — unchecked errors, races, off-by-one, missing edge cases, unsafe defaults, swallowed exceptions. Test: name the concrete input/state producing wrong behavior. Cannot construct the failure = anxiety, not a finding. This = Breaks.

De-duplicate: collapse shared roots into one root-cause finding, not five symptoms.

## Step 4 — Assess the rules for drift

A rule contradicting current code/config is itself a finding — **rule drift**. Emit a **rule-update proposal** (file + section + quoted rule + contradiction + proposed edit + reasoning); never silently work around a stale rule. The proposal routes to `feedback` (it changes a rule, not a codebase fact). Boundary: AGENTS.md prose outgrown by source is a codebase-fact drift, not rule drift — it routes to `plan` as a factual fix; `audit-docs` owns detecting it.

## Step 5 — Report

Findings grouped by file, severity-sorted (blockers first), one scale for all kinds — blocker / should-fix / nit: the kind (check / rule / judgment) + its rule or named cost, the violation or evidence, severity + one clause of blast radius (which callers/tests/docs it risks); judgment findings add a one-sentence suggested direction — not the fix contract. Every citation is file + anchor from this session's read. Route every finding — severity orders the report and drives batching, never filters routing (a grounded nit is a verified violation, and a class of verified violations nobody fixes is unowned debt): in-contract — files and behavior inside the executing plan's delta, judgment findings included — hand to the worker's redo pass (one pass); scope-expanding findings hand to `plan`, nits batched into one sweep unit rather than one unit each. Zero findings → say so, stop; a clean audit is valid.

## Worked example

Illustrative findings on a HellaJS-shaped target — all three finding kinds plus the drift mechanism via a true repo story. Each finding grounds in a check, a rule, or a named cost, never taste; that is the audit discriminator.

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

SHOULD-FIX
  Judgment (API & interface design). Cost: Misleads.
  `applyUpdate(merge, patch, silent)` — the third positional param silently
  skips both notify and $update; the signature hides a behavior change.
  Evidence: the silent branch early-returns before both effects (read this
  session).
  Blast: 1 caller passes silent expecting $update to still fire.
  Direction: split into two named functions or take an options object.

Drift mechanism (true story): memory/entries/070 recorded that
  `guides/tests.md`'s phrase "flush the microtask queue" was imprecise —
  `delay()` is ONE microtask hop. The guide now reads "drain one microtask hop
  … NOT sufficient for multi-hop chains". Drift found → rule-update proposal →
  guide fixed. That loop is Step 4's product.
```

Route every finding: in-contract → the worker's redo pass; scope-expanding → `plan` (nits batch into one sweep unit). The rule-drift proposal routes to `feedback` (it changes a rule, not a codebase fact).

Run the prime handoff gate; evaluate the `feedback` trigger table literally — needed rule set absent → `memory` (recallable fact about this repo's config state); rule self-contradiction → `feedback` (rule-update proposal); rule/skill boundary unclear enough to need careful routing → `feedback` (boundary deserves a clarifying edit); callers hard to locate (grep missed importers) → `memory` (recallable technique for this codebase's import shape).
