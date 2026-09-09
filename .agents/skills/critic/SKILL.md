---
name: critic
description: >
  Judge code for over-engineering, unnecessary complexity and abstraction, tight coupling, dead or duplicate code, misleading naming or file layout, API/interface design (parameter names, order, types, return shapes, and the contract callers learn), and correctness smells — the judgment-based review with no lint rule behind it (`audit` owns rule-grounded review; this owns taste). Every finding passes a cost gate: it names a concrete cost (it breaks, hampers, misleads, or bloats) and cites source read this session. Use when asked to critique, review for code smells, flag over-engineering/complexity, or assess API/interface design. Use ONLY for judgment-based critique — route any finding backed by a runnable check or quoted project rule to `audit` instead.
---

# Critic

One skill, one target at a time. Diagnose code for over-engineering, complexity/coupling, dead/duplicate code, naming/layout, API/interface design, correctness smells — the judgment review `audit` excludes. Every finding passes the **cost gate**: names one concrete cost — *breaks*, *hampers*, *misleads*, or *bloats* — and cites source read this session. No real cost → nitpick, drop. Silence is valid; manufacturing findings to seem thorough is the failure mode. critic owns **diagnosis**; `plan` owns the fix contract. Governed by prime.

## The cost gate (fairness rule)

- **Breaks** — bug, crash, race, data loss, security hole, wrong output for a concrete input. Correctness smells live here. Highest severity.
- **Hampers** — change A forces unrelated changes B and C: tight coupling, leaky abstraction, god-object, speculative generality. Maintenance tax.
- **Misleads** — name/type/path that makes a reader guess wrong about behavior or location. Onboarding tax.
- **Bloats** — unreachable code, unused exports, near-duplicate blocks, surface with no caller. Carrying cost.

"I'd write it differently" → not a finding. One cost per finding. Smell fits a runnable check or quoted rule → hand to `audit`.

## Step 1 — Pick one target

One target per invocation, no mixing: a file, module, or sub-system under `packages/`/`plugins/`; or a changeset (`HEAD`, branch, PR/diff — critique what changed, in context). Narrow scope forces depth.

## Step 2 — Read the target in its neighborhood

A smell is rarely visible in isolation. Read in parallel:

- Target files in full (bounded slices if large; truncated reads → wrong conclusions).
- Imports and immediate neighbors — both directions.
- Callers — repo-wide `rg` for every importer of the target's symbols (prose enumeration misses greppable references; a guess is fabrication). Dead-code/coupling findings stand or fall on this.
- Surface arbiters: `packages/<pkg>/lib/index.ts` barrel; dom's typed-surface mirror (`lib/types/nodes.d.ts` + `lib/types/attributes.d.ts`, §Non-negotiables). A Surface finding's blast radius includes every importer.
- Stated intent: the package's `AGENTS.md` + `guides/` — separates intentional design from smell, routes rule-grounded issues to `audit`.
- `memory/entries/` (grep `memory/index.md` for the target's symbols) — prior verified decisions; a contradicting finding needs new evidence. `{pkg}-comparison.md` is a published behavior contract.

## Step 3 — Apply the six lenses

Each lens carries the test separating a real finding from noise:

- **Over-engineering** — abstraction with no second caller *today*; config/flags/indirection "for the future"; generic solver where one concrete case exists. Test: paying for itself right now? Speculative generality = Hamper.
- **Complexity & coupling** — deep nesting, god-objects, leaky abstractions, circular deps, change-one-break-many. Test: can a reasonable change land in one place without design-forced ripple? Forced ripple = Hamper.
- **Dead & duplicate code** — unreachable branches, unused exports, empty/swallowed handlers, near-identical blocks with drift risk. Test: does `rg` find a caller (dead) or 2+ drifting copies (duplicate)? Unverifiable → dropped. (`bun dead-exports` guards exports — this lens owns the unexported interior.)
- **Naming & file layout** — names that lie about behavior; types/paths contradicting the role. Test: would a new contributor guess wrong from name/path? Yes = Mislead. `guides/code.md` §Canonical paths is the arbiter; pure convention breaks → `audit`.
- **API & interface design** — param names, order, types, optionality, return shape, arity, and the contract a caller must learn. Test: could a caller use it correctly from the signature alone? Hides a requirement, contradicts the name, demands out-of-band knowledge, or forces an awkward call shape = Mislead or Hamper.
- **Correctness smells** — unchecked errors, races, off-by-one, missing edge cases, unsafe defaults, swallowed exceptions. Test: can you name the concrete input/state producing wrong behavior? Cannot construct the failure = anxiety, not a finding. This = Break.

## Step 4 — Fairness filter

- Cost gate: every finding names one Break/Hamper/Mislead/Bloat + one-clause justification.
- De-duplicate: collapse shared roots into one root-cause finding, not five symptoms.
- Route: anything with a runnable check or quoted rule → `audit`; keep only judgment.
- Verify citations: file + anchor from this session's read; no memory, no generalizing one example into a blanket claim.
- Severity + blast radius: Critical/Major/Minor, justified by cost magnitude × callers/tests/docs touched.

## Step 5 — Report

Findings grouped by file, severity-sorted (Critical first): lens, the single named cost, file + anchor, one-line evidence, severity + blast radius, suggested direction (one sentence — not the fix contract). Hand actionable findings to `plan`. Nothing clears the cost gate → say so, stop; a clean critique is valid.

## Worked example

Illustrative findings on `packages/resource/lib/cache.ts` (illustrative anchors; the file is real). Two findings across two lenses, each clearing the cost gate.

```
packages/resource/lib/cache.ts

CRITICAL
  Lens: correctness smells. Cost: Breaks.
  `readThrough` writes `undefined` into the cache slot both on a fetch miss and on
  a rejected fetch; callers cannot distinguish "not fetched" from "fetch failed".
  Evidence: both branches assign `undefined` to the slot (read this session).
  Blast: 2 callers treat `undefined` as "loading" — failures render as permanent
  loading states instead of surfacing via `error()`.
  Direction: store the rejection; surface it through the error channel. No sentinel.

MAJOR
  Lens: complexity & coupling. Cost: Hampers.
  TTL eviction runs mid-insertion inside the LRU write path, after the recency
  list is reordered; any TTL-policy change requires reasoning about recency
  invariants.
  Evidence: `put()` calls the expiry sweep between the reorder and the size trim.
  Blast: policy changes risk corrupting recency order — a silent cache bug class.
  Direction: extract eviction as a composed step outside the write path.
```

Hand actionable findings to `plan` (critic stops at direction). No cost-gated finding → nothing to report — silence is valid.

Run the prime handoff gate; evaluate the `feedback` trigger table literally: rule/skill boundary unclear enough to need careful routing → `feedback` (boundary deserves a clarifying edit); callers hard to locate (grep missed importers) → `memory` (recallable technique for this codebase's import shape).
