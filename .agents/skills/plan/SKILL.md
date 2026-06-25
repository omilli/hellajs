---
name: plan
description: Create a plan document from a discovery handoff (feature or audit). Derives a shared Contract from the style guides, forks on surface change, and writes typed tasks with binary Definitions of Done the worker skill executes.
---

# Plan

Turn a discovery handoff into a plan document under `./plans/`. The plan is a contract the worker skill executes by ticking `[ ]` to `[x]`, so its structure must match what the worker parses.

Two files own this skill. This one is the workflow — the six phases that produce the artifact. `TEMPLATE.md` is the artifact contract — the file shapes, the surface-change fork, the Contract block, the DoD seed blocks. Read TEMPLATE.md before writing and copy its structure verbatim. When the two disagree, TEMPLATE.md wins on shape.

## Non-negotiables

Two rules govern this skill absolutely. They exist because the project's end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if every skill treats the guides as inviolable and every change as carrying its full blast radius.

**Guides are inviolable.** Every artifact this skill produces follows the matching guide (`code.md` / `tests.md` / `docs.md`). A conflict between the work and a guide is never resolved by silently working around it. Emit a **guide-update proposal** and pause for the user to resolve it case by case:

> **Guide**: `guides/{file}.md` §{section}
> **Rule**: [quote the rule that conflicts]
> **Conflict**: [what the work requires]
> **Proposal**: [the specific edit to the guide, with reasoning]

The user accepts (the guide changes), rejects (the work changes), or defers. Proceeding past an unresolved conflict is silent deviation, and silent deviation is how uniformity dies.

**Every change carries its full blast radius.** The Contract MUST enumerate the full blast radius: every touched source file, every test that pins the behavior (existing or new), every doc that publishes it (existing or new), and every cross-package caller of a changed signature. Phase 5 verifies consistency across all of them — a Public API delta that breaks a caller in another package adds a task in that package, or the delta is backward-compatible by construction.

## The three guides, three roles

The guides are three views of one surface: `code.md` defines the shape, `tests.md` defines the verification, `docs.md` defines the publication. They are not independent — a `code.md` file-structure rule ("one public function per file, filename matches export") forces a `tests.md` consequence (a surface-named `{feature}.test.ts`) and a `docs.md` consequence (an `api/{export}.mdx`). Apply each guide at the right phase, or you do the same work three times:

| Phase | Guide role | What it means |
|---|---|---|
| 2 — Contract | **INPUT** | Derive each Contract artifact BY APPLYING the relevant guide section. The Contract is guide-shaped before the worker sees it. |
| 3 — Strategy | **CONSTRAINT** | Check the approach against `code.md` decision precedence and structure rules. The guides constrain; they do not determine. |
| 4+ — DoD / worker / audit | **VERIFICATION** | Catch anything Phase 2 missed. The safety net, not the primary enforcement. |

The primary enforcement is Phase 2. Verification is the backup. If you rely on the audit to catch Contract-shape violations, Phase 2 was incomplete.

## Phase 0 — Intake

Receive the evidence map from the discovery skill (feature or audit). Verify it contains:

- **Gap** — one sentence: what is missing or wrong.
- **Scope hint** — discovery's read of where the gap lives: `surface` | `internal` | `docs` | `config` | `tests`. Plan verifies this by reading `index.ts`; it does not trust it blindly.
- **Citations** — one or more `{ file, anchor, what-it-shows }`. Anchors are function or heading names, not bare line numbers.
- **Comparison rows** (feature only) — section + row from `[pkg]-comparison.md`.

If the scope hint or citations are missing, ask before proceeding. Do not plan into fog — every open question becomes a wrong assumption in the Contract.

## Phase 1 — Surface detection (the fork)

Read `packages/[pkg]/index.ts`. Determine surface change per TEMPLATE.md's definition: does the change add, change, or remove any symbol `index.ts` re-exports, or any field on a public type consumers pass, or any public signature? This is factual — read the barrel and the cited type files; do not guess from the feature description.

If the work is not in a package workspace (scripts, root config, guides, docs infrastructure), Surface change is `no` by definition — there is no public API barrel to change. Skip the `index.ts` read and proceed to Phase 2 with `no`.

- `yes` → trio (Code + Tests + Docs sub-tasks, minimum). The surface has three views; all three must land together.
- `no` → single task of the matching type. Tests-view and Docs-view fields still appear and justify the absence of siblings.

A single obvious edit does not need a plan — say so and stop.

## Phase 2 — Contract crystallization (guides as INPUT)

Read the relevant guide sections per the governance header you are about to write. Derive each Contract artifact by applying its guide — the artifact is the OUTPUT of that application, not authorial intuition:

- **Files** ← `code.md` §Package File Structure, §Files, §index.ts Rules. A new public export forces a new `lib/[name].ts` (filename = export name verbatim). A new internal helper forces `lib/internal/[concern].ts` (single-noun concern). A new public type forces `lib/types/*.d.ts`; an internal type is co-located with its owning module. Each file entry carries a content anchor (function/heading name + relative position), not a bare line number.
- **Public API delta** (Surface change: yes) ← `code.md` §Types, §Naming, §JSDoc. `interface` vs `type`, `Options` vs `Config`, `Fn` suffix, overload signatures before implementation, camelCase fields. Append one runnable usage example (import, call, return) per `docs.md` §Code Examples — it validates the API design (if you cannot write the call, the API is wrong) and seeds the Docs task.
- **Behavioral scenarios** (if tests in scope) ← `tests.md` §Test Structure, §Anti-Patterns, §Files, §Naming. Each scenario is one behavior (`tests.md` forbids two-behavior tests), phrased as one `test()` in present tense, living in a file named after the specific surface (no categorical prefix — `invalidates.test.ts`, not `features-invalidation.test.ts`), one `describe` max. Shape the scenarios so the worker transcribes compliant tests without re-reading the guide to decide structure.
- **Doc placement** (if docs in scope) ← `docs.md` §Template Selection and the matching template section. Which file owns this symbol, which template (Function / Prefix / Concept / Pattern / Index / Tutorial), which section the new content extends. Name the file, the template, and the section. For multi-method exports (per `docs.md` §Multi-Method Exports), place new options in the interface block and earn a `###` under `## Key Concepts` when the behavior warrants explanation.

Write the **Guide governance** header as you derive — cite the section you applied to each artifact. The citations make the application checkable: audit verifies the cited section actually governs the artifact, and a mismatch is a finding.

Fill **Tests-view** and **Docs-view**. For Surface change: yes, point at the scenarios and placement above. For Surface change: no, justify the absence with a cited reason ("internal helper, not re-exported by `index.ts`; `tests.md` covers the public surface only; existing tests pass"). These fields are required on every code-touching plan; the worker rejects their omission.

## Phase 3 — Strategy per task (guides as CONSTRAINT)

For each task, write 2–4 sentences: the approach, the key decisions, the trade-offs considered and rejected. Check against:

- `code.md` §Decision Precedence (Correctness > Performance > Backward compatibility > Clarity > Brevity).
- `code.md` §Functions & Modules (no wrapper functions that only forward, no pass-through params, no single-callsite helpers under 30 lines).
- `code.md` §Loops (cached `while` on hot paths; no `for…of` / `for…in`).
- The anti-pattern sections of `tests.md` / `docs.md` for the matching task.

Strategy is where design judgment lives so the worker does not re-exercise it. Keep it short — advisory context, not a parse target.

## Phase 4 — DoD derivation

Seed from TEMPLATE's matching type block. Drop inapplicable items. Add Contract-derived items so the DoD is an exhaustive mirror of the Contract — nothing in the Contract goes unchecked:

- Every Files entry → a DoD item verifying the file was touched as specified.
- Every scenario → a DoD item verifying a `test()` exists for it.
- Every doc-placement entry → a DoD item verifying the section exists with the specified content.
- Every Public API delta line → a DoD item verifying it appears verbatim in the implementation and the doc.

## Phase 5 — Cross-task and cross-package consistency

Before saving:

- Every Code file that adds behavior has matching scenarios in Behavioral scenarios.
- Every Public API delta line is mirrored in Doc placement.
- Every scenario imports the same delta signatures.
- Dependencies are ordered: Code before Tests before Docs (Config slots wherever its tooling demands).
- Cross-package callers checked: for every Public API delta, grep the monorepo for importers of the changed symbol. A broken caller adds a Code (and Tests, and Docs) task in that package, or the delta is backward-compatible by construction.

Mismatches go back to Phase 2.

## Phase 6 — Self-check

- Does every Contract artifact cite its governing guide section in the governance header?
- Does every code-touching plan carry Tests-view and Docs-view, each with cited reasoning?
- For Surface change: yes, do Code + Tests + Docs sub-tasks all exist, sharing one Contract?
- Does the H1 title carry the `[ ]` aggregate-status marker, per TEMPLATE.md Hard rules?
- Could a dev who never read the discovery handoff execute each task from this artifact alone? If not, the Contract is incomplete — add the missing piece before saving.

## Handoff

Save the plan, then hand the contract to `worker` for execution. If `worker` is unavailable (absent from your session — it is a global-inherited skill, not vendored in this repo), emit the standard signpost per §Skills Graceful degradation rather than dead-ending: the Contract is self-sufficient, so a contributor can execute it manually — work each task against its Strategy, tick every Definition of Done item `[ ]`→`[x]` only with cited evidence, and run `bun check <package>` as the floor. Do not leave the loop at an implicit edge.
