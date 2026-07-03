---
name: brain-critic
description: >
  Fairly critique, review, or grade code for over-engineering, unnecessary complexity and abstraction, tight coupling, dead or duplicate code, misleading naming or file layout, API/interface design (parameter names, order, types, return shapes, and the contract callers learn), and correctness smells — the judgment-based review that `brain-audit` deliberately excludes (audit is rule-grounded; this is the taste that has no lint rule behind it). Every finding passes a cost gate: it names a concrete cost (it breaks, hampers, misleads, or bloats) and cites source read this session. Use when asked to critique, review for code smells, flag over-engineering/complexity, or assess API/interface design. Use ONLY for judgment-based critique — route any finding backed by a runnable check or quoted project rule to `brain-audit` instead.
---

# Critic

One skill, one target at a time. Diagnose code for over-engineering, complexity/coupling, dead/duplicate code, naming/layout, API/interface design, correctness smells — the judgment review `brain-audit` excludes (no lint rule behind it). Every finding passes the **cost gate**: names a concrete cost — *breaks*, *hampers*, *misleads*, or *bloats* — and cites source read this session. No real cost → nitpick, drop. Silence is valid; manufacturing findings to seem thorough is the failure mode. brain-critic owns **diagnosis** (what + why it costs); `brain-plan` owns the fix contract. Governed by brain-prime.

## The cost gate (fairness rule)

A finding is fair only if it names a concrete cost from this session's read. One primary cost:

- **Breaks** — bug, crash, race, data loss, security hole, wrong output for some concrete input. Correctness smells live here. Highest severity.
- **Hampers** — change A forces unrelated changes B and C; tight coupling, leaky abstraction, god-object, speculative generality. Maintenance tax.
- **Misleads** — name/type/path that makes a reader guess wrong about behavior or location. Onboarding/readability tax.
- **Bloats** — unreachable code, unused exports, near-duplicate blocks, surface area with no caller. Carrying cost.

"I'd write it differently" / "style preference" → not a finding, drop. One concrete cost per finding. Smell fits a runnable check or quoted rule → hand to `brain-audit`.

## Step 1 — Pick one target

One target per invocation, no mixing:

- A file, module/directory, or sub-system.
- A changeset (`HEAD`, branch, PR/diff) — critique what changed, in context of what it touches.

Narrow scope forces depth.

## Step 2 — Read the target in its neighborhood

A smell is rarely visible in isolation. Read in parallel:

- Target files in full (bounded slices if large; truncated reads → wrong conclusions).
- Imports and immediate neighbors — depends on what, and what depends on it.
- Callers — grep every importer of the target's symbols. Dead-code/coupling findings stand or fall on this; a guess is fabrication.
- Public entry/barrel, if any — which symbols are surface (a Surface finding's blast radius includes every importer).
- Conventions/guides if present — tell intentional design from a smell, and route rule-grounded issues to `brain-audit`.

## Step 3 — Apply the six lenses

Each lens carries the test that separates a real finding from noise:

- **Over-engineering** — abstraction with no second caller *today*; config/flags/indirection built "for the future"; generic solver where one concrete case exists. Test: paying for itself right now? Speculative generality = Hamper.
- **Complexity & coupling** — deep nesting, god-objects, leaky abstractions, circular deps, change-one-break-many. Test: can a reasonable change land in one place without design-forced ripple? Forced ripple = Hamper.
- **Dead & duplicate code** — unreachable branches, unused exports, empty/swallowed handlers, near-identical blocks with drift risk. Test: does grep find a caller (dead) or 2+ drifting copies (duplicate)? Unverifiable → dropped.
- **Naming & file layout** — names that lie about behavior; types/paths contradicting the role. Pure convention breaks → `brain-audit`. Test: would a new contributor guess wrong from name/path? Yes = Mislead.
- **API & interface design** — full signature: param names, order, types, optionality, return shape, arity, and the contract a caller must learn (symbol/file naming belong to the naming lens). Test: could a caller use this correctly from the signature alone, without reading the body? If it hides a requirement, contradicts the name, demands out-of-band knowledge, or forces an awkward call shape = Mislead or Hamper.
- **Correctness smells** — unchecked errors, races, off-by-one, missing edge cases, unsafe defaults, swallowed exceptions. Test: can you name the concrete input/state producing wrong behavior? Cannot construct the failure = anxiety, not a finding. This = Break.

## Step 4 — Fairness filter

Before reporting:

- Cost gate — every finding names one Break/Hamper/Mislead/Bloat + one-clause justification. Drop preference-only.
- De-duplicate — collapse findings sharing a root into one root-cause finding, not five symptoms.
- Route — anything with a runnable check or quoted rule → `brain-audit`; keep only judgment.
- Verify citations — file + anchor (function/type/heading) from this session's read; no memory, no generalizing one example into a blanket claim.
- Severity + blast radius — Critical/Major/Minor, justified by cost magnitude × callers/tests/docs touched.

## Step 5 — Report

Findings grouped by file, severity-sorted (Critical first): lens, the single named cost, file + anchor, one-line evidence, severity + blast radius, suggested direction (one sentence — not the fix contract). Offer to hand actionable findings to `brain-plan` (it scopes fixes; critic does not write the contract). Nothing clears the cost gate → say so, stop; a clean critique is valid.

Run the brain-prime handoff gate; friction signals: a smell that needed careful routing to `brain-audit` because the rule/skill boundary was unclear, or a target whose callers were hard to locate (grep missed importers).
