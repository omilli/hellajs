---
name: brain-critic
description: >
  Fairly critique, review, or grade code for over-engineering, unnecessary complexity and abstraction, tight coupling, dead or duplicate code, misleading naming or file layout, API/interface design (parameter names, order, types, return shapes, and the contract callers learn), and correctness smells — the judgment-based review that `brain-audit` deliberately excludes (audit is rule-grounded; this is the taste that has no lint rule behind it). Every finding passes a cost gate: it names a concrete cost (it breaks, hampers, misleads, or bloats) and cites source read this session. Use when asked to critique, review for code smells, flag over-engineering/complexity, or assess API/interface design. Use ONLY for judgment-based critique — route any finding backed by a runnable check or quoted project rule to `brain-audit` instead.
---

# Critic

One skill, one target at a time. Fairly diagnose code for over-engineering, complexity and coupling, dead or duplicate code, naming or file layout, API/interface design, and correctness smells — the judgment-based review `brain-audit` excludes. Audit is rule-grounded; this is the taste with no lint rule behind it — the shape of public interfaces, the names and parameters callers must learn, the abstractions and coupling the next change inherits. Every finding passes the **cost gate**: it names a concrete, articulable cost — it *breaks*, *hampers*, *misleads*, or *bloats* — and cites source read this session. A finding with no real cost is a nitpick; drop it. Silence is a valid outcome; manufacturing findings to seem thorough is the failure mode this skill exists to avoid.

brain-critic owns **diagnosis** — what is wrong and why it costs. `brain-plan` owns **the fix contract**. brain-critic hands off findings; it does not write the contract, and `brain-worker` depends on that boundary.

Two non-negotiables govern this skill (see `brain-prime`): rules inviolable (if a finding has a runnable check or quoted project rule, route it to `brain-audit`; if a convention is stale, emit a convention-update proposal — never a silent workaround) and full blast radius (every severity rating names the callers, tests, and docs it touches).

## The cost gate (the fairness rule)

A finding is fair only if it names a concrete cost from this session's read. Pick one primary cost:

- **Breaks** — a bug, crash, race, data loss, security hole, or wrong output for some concrete input. Correctness smells live here. Highest severity.
- **Hampers** — change A forces unrelated changes B and C; tight coupling, leaky abstraction, god-object, speculative generality. The maintenance tax.
- **Misleads** — a name, type, or file path that makes a reader guess wrong about behavior or location. The onboarding and readability tax.
- **Bloats** — unreachable code, unused exports, near-duplicate blocks, surface area with no caller. The carrying cost.

If the only thing to say is "I'd write it differently" or "style preference," it is not a finding — drop it. One concrete cost per finding keeps the report honest and actionable. When a smell clearly fits a runnable check or quoted project rule, hand it to `brain-audit` instead; this skill is the complement, not the duplicate.

## Step 1 — Pick one target

Ask the user what to point at — one target per invocation, no mixing:

- A file, a module/directory, or a sub-system.
- A changeset (`HEAD`, a branch, a PR/diff) — critique what changed, in the context of what it touches.

A scattered critique is a shallow critique; narrow scope forces depth.

## Step 2 — Read the target in its neighborhood

A smell is rarely visible in isolation. Before judging, read in parallel:

- The target files in full (bounded slices if large; truncated reads produce wrong conclusions).
- Imports and immediate neighbors — what it depends on, and what depends on it.
- Callers — grep the repo for every importer of the target's symbols. Dead-code and coupling findings stand or fall on this; a guess is fabrication.
- The public entry/barrel, if any — to know which symbols are surface (a Surface finding's blast radius includes every importer).
- Conventions/guides if present — to tell intentional design from a smell, and to route rule-grounded issues to `brain-audit`.

## Step 3 — Apply the six lenses

Each lens carries the test that separates a real finding from noise:

- **Over-engineering** — abstraction with no second caller *today*; config, flags, or indirection built "for the future"; a generic solver where one concrete case exists. Test: is it paying for itself right now? Speculative generality is a Hamper.
- **Complexity & coupling** — deep nesting, god-objects, leaky abstractions, circular dependencies, change-one-break-many. Test: can a reasonable change land in one place without ripple forced by the design? Forced ripple is a Hamper.
- **Dead & duplicate code** — unreachable branches, unused exports, empty/swallowed handlers, near-identical blocks with drift risk. Test: does grep find a caller (dead) or two-plus drifting copies (duplicate)? Unverifiable claims get dropped.
- **Naming & file layout** — names that lie about behavior; types or paths that contradict the role. Pure convention breaks route to `brain-audit`. Test: would a new contributor guess wrong from the name or path? If yes, it is a Mislead.
- **API & interface design** — the full signature: parameter names, order, types, optionality, return shape, arity, and the contract a caller must learn to use it correctly (symbol and file naming belong to the naming lens). Test: could a caller use this correctly from the signature alone, without reading the body? If the signature hides a requirement, contradicts the name, demands out-of-band knowledge, or forces an awkward call shape, it is a Mislead or Hamper.
- **Correctness smells** — unchecked errors, races, off-by-one, missing edge cases, unsafe defaults, swallowed exceptions. Test: can you name the concrete input or state that produces wrong behavior? If you cannot construct the failure, it is anxiety, not a finding. This is a Break.

## Step 4 — Run the fairness filter

Before reporting:

- Cost gate — every finding names one Break / Hamper / Mislead / Bloat with a one-clause justification. Drop anything that is only preference.
- De-duplicate — collapse findings sharing a root into one root-cause finding, not five symptoms.
- Route — move anything with a runnable check or quoted rule to `brain-audit`; keep only judgment here.
- Verify citations — file plus anchor (function/type/heading name) from this session's read; no memory, no generalizing a single example into a blanket claim.
- Severity with blast radius — Critical / Major / Minor, each justified by cost magnitude times the callers, tests, and docs it touches.

## Step 5 — Report, then offer hand-off

Present findings grouped by file, severity-sorted within each (Critical first). For each: the lens, the single named cost, file plus anchor, the one-line evidence, severity plus blast radius, and a suggested direction (one sentence — not the fix contract). Then offer to hand the actionable findings to `brain-plan` to scope the fixes; brain-critic does not write the contract. If nothing clears the cost gate, say so and stop — a clean critique is a valid outcome.

Run the self-improvement track (`brain-prime` handoff gate) before closing. This skill's friction signals: a smell that required careful routing to `brain-audit` because the rule/skill boundary was unclear, or a target whose callers were hard to locate (grep missed importers). A confirmed dead-code, coupling, or surface-shape fact worth recalling is a memory event. Invoke `brain-feedback` (rule change) or `brain-memory` (recallable fact) yourself; do not make the user ask.

## Self-check

a. Does every finding name exactly one concrete cost (Break / Hamper / Mislead / Bloat) — not preference?
b. Does every finding cite a file plus anchor read this session — no memory, no fabrication?
c. Were callers grepped before any dead-code or coupling claim was made?
d. Did I route rule-grounded findings to `brain-audit` rather than duplicating them here?
e. Did I collapse duplicate symptoms into one root-cause finding?
f. Does every severity rating name its blast radius (callers, tests, docs)?
g. Did I hand fixes to `brain-plan` rather than write the contract myself?
h. If I found nothing, did I say so and stop — rather than pad the report?
i. Did I route friction and durable facts to `brain-feedback`/`brain-memory` instead of leaving it for the user to invoke?
