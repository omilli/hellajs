---
name: plan
description: >
  Lay out a plan — one or more tracked, verifiable contracts (files to touch, binary Definitions of Done, blast radius, hard inter-file deps) — before executing non-trivial work. Use when work spans multiple steps or files, when you want a reviewable spec before implementation, or when handed evidence maps from discovery (idea/audit/critic/feature). Produces one file per independently-shippable unit. Use ONLY for non-trivial work; a one-line fix skips planning entirely.
---

# Plan

Turn a goal — or evidence map(s) from discovery — into plan files: contracts `worker` executes by ticking `[ ]` to `[x]`. One file = one independently-shippable unit; inter-dependent units declare it in frontmatter (`depends_on`). plan produces the artifact; `worker` executes it. `idea` may precede (decide *what* before *how*); on `worker` verification failure, debug methodically (isolate, one-line hypothesis, root cause, re-verify), don't patch symptoms. Governed by prime.

## Escape hatch

Single obvious edit → no plan. Say so, make the change, verify, stop. Don't formalize trivia.

## Phase 0 — Intake

Plain goal, one evidence map, or a set of them. If evidence map(s), verify each carries:

- **Gap** — one sentence: target state (what's missing/wrong, phrased as what will be true).
- **Scope hint** — `surface` (public/exported symbol or consumed contract) / `internal` / `docs` / `config` / `tests`. Plan re-verifies `surface` against the arbiters in Phase 2; doesn't trust the hint.
- **Citations** — one or more `{ file, anchor, what-it-shows }`. Anchors are function/type/heading names, not line numbers.
- **Type tag** — Code / Tests / Docs / Config.

Scope/citations missing → ask before proceeding. Don't plan into fog — every open question becomes a wrong assumption.

## Phase 1 — Decompose into shippable units

Decide how many plan files this intake produces. **One file = one independently-shippable unit**: a change that could land and revert alone with the repo green and coherent. Blast-radius boundary = split boundary.

- Cluster by shared blast radius. Two changes touching the same files, or where one is incorrect/not-green without the other = ONE unit. Independent blast radii = SEPARATE units.
- A Surface:yes change's Code+Tests+Docs (Phase 3) are one atomic unit — never split across files.
- Don't over-split: two units that must land atomically (repo red/incoherent with only one) = one unit. Don't under-split: one file with many tasks usually = distinct units glued together — split so each tracks/reviews/reverts independently.
- Trivia (single obvious edit) → escape hatch, not a file.

Outcome: 1..N units. N=1 → Phases 2–5 once, one file. N>1 → Phases 2–4 once per unit, sibling files in one shared `plans/<package>/<category>/<topic>/` folder; Phase 5 stitches with deps.

## Phase 2 — Surface fork (per unit)

Does the work change a package's public surface (any exported symbol, any field on a type callers pass, any publicly consumed signature or documented behavior)? Factual — read the surface, don't guess from the goal:

- Package barrel `packages/<pkg>/lib/index.ts` — the export arbiter and the docs barrel (`guides/docs.md` §Canonical paths).
- dom's typed-surface mirror: `lib/types/nodes.d.ts` + `lib/types/attributes.d.ts` mirror one contract with no import edge between them — widen both or neither (§Non-negotiables).
- Plugin entries `plugins/<p>/index.mjs`.
- Documented behavior is surface even when types don't move — docs and `{pkg}-comparison.md` describe the contract callers learn.

- `yes` → three views landing together: **Code** + **Tests** + **Docs**. Scope all three.
- `no` → one task of the matching type. Tests-view and Docs-view still appear, justifying absence with a cited reason ("internal helper, not exported; existing tests cover the public surface").

No public-surface notion (scripts, agent config, tooling) → Surface `no` by definition; skip the export read.

## Phase 3 — Contract crystallization

Derive each artifact by applying the project's own rules (guides, lint, config conventions), not authorial intuition:

- **Files** — each file to touch, with a content anchor (function/type/heading + relative position), not a line number.
- **Change / delta** — for Surface: yes, the exact signature/shape change + one runnable usage example (if you can't write the call, the design is wrong; the example seeds the Docs task).
- **Behavioral scenarios** (if tests in scope) — one behavior per scenario, phrased as one test, so `worker` transcribes without re-deciding structure.
- **Doc updates** (if docs in scope) — which file/section owns this, what content extends it.
- **Definitions of Done** — binary items, each tied to a contract artifact: every Files entry → DoD item; every scenario → DoD item; every doc update → DoD item; every delta line → DoD item. DoD is an exhaustive mirror of the contract — nothing goes unchecked. Every item states a runnable check, never a predicted result (§Core rules).

## Phase 4 — Strategy per task

2–4 sentences per task: approach, key decisions, trade-offs considered and rejected. Where design judgment lives so `worker` doesn't re-exercise it. Short — advisory, not a parse target. Add a short example if user-facing/API.

## Phase 5 — Cross-task consistency and blast radius

Before finalizing:

- Every code change has matching scenarios.
- Every public delta reflected in doc updates.
- Deps ordered (Code before Tests before Docs; Config wherever its tooling demands).
- Each unit is a vertical slice — its Code+Tests+Docs land and ship together. Resist horizontal (type-)batching across siblings: unit-at-a-time is the model; `worker` finishes one slice before starting the next.
- Inter-file deps: when one unit is incorrect/not-green unless another has landed, the dependent declares `depends_on: [sibling-basename, ...]`. **Hard deps only** — repo must be red/incoherent without it. Soft ordering stays in Strategy prose. Basenames resolve within the same topic folder.
- Cross-module callers checked: for every public delta, `rg` importers across the repo — a call-site grep is the floor (§Folder structure notes the surfaces a grep misses, e.g. dom's type mirror). A broken caller adds a task in that module, or the delta is backward-compatible by construction.
- Test scenarios follow `guides/tests.md` (scenario → `test()` derivation, anti-patterns, naming) — name files after the surface it prescribes.
- Surface inventories synced: adding/renaming/removing a public symbol updates the per-package `AGENTS.md` file map (anchors are `file.ts symbol`, never line numbers) and README API lists — add a Files entry, or it goes stale.
- A `lib/` change that alters behavior a `{pkg}-comparison.md` cell describes re-verifies that comparison doc inside the same unit — snapshots drift silently (§Non-negotiables).
- Coverage DoD reachable from Tests scope: a multi-branch Code delta needs enough tests to hit stated coverage. Can't reach DoD → widen Tests or relax DoD explicitly; an unsatisfiable contract is a defect.

Mismatches → back to Phase 3.

## Phase 6 — Propose, then hand to worker

Present the plan set. Write one file per unit to `plans/<package>/<category>/<topic>/<unit>.md` (categories observed: `code`, `docs`, `misc`, `config`; folder per topic; unit-named files), each with frontmatter `depends_on:` if it has hard deps, and link the set inline. State the dep graph.

For N>1, also write `plans/<package>/<category>/<topic>/index.md`: top-level `# [ ] Plan set: <topic>` aggregate, shared scope, and a bullet list linking each sibling with a one-line description + hard deps. Set-level entry point — `worker` updates it as files complete.

On approval, hand to `worker` — don't execute tasks yourself unless small enough to have used the escape hatch.

## Worked example

Illustrative contract (the option is hypothetical; every path and surface is real — `signal` is re-exported by `packages/core/lib/index.ts` and already takes an options type). Shows the Surface:yes fork landing Code+Tests+Docs as one atomic unit, each task carrying Files/Delta/Strategy and a binary DoD `worker` ticks.

```
# [ ] Add `label` to `signal()`'s options

## Scope
- Gap: signals are anonymous in devtools traces; callers cannot attach a debug label.
- Surface: yes — new field on the options type callers pass; `signal` re-exported by
  `packages/core/lib/index.ts`.
- Type: Code + Tests + Docs (atomic — Surface:yes).

## [ ] Code
Files: `packages/core/lib/signal.ts` — `signal` overloads + the options type.
Delta: optional `label?: string` on the options type; stored on the signal node.
Strategy: extend the existing options bag — a new param would shift the overload set.
Default unset preserves behavior. Runnable usage: `signal(0, { label: "count" })`.

- [ ] Options type accepts `label`; value stored on the node.
- [ ] Calls without `label` behave identically to today (overload set unchanged).

## [ ] Tests
Files: `packages/core/tests/signals.test.ts`.

- [ ] A labeled signal stores the label; an unlabeled one leaves it undefined
  (both overload shapes exercised).
- [ ] `bun coverage core` green with the new scenarios.

## [ ] Docs
Files: `packages/core/docs/api/signal.mdx`.

- [ ] Options table gains the `label` row using the Code delta's runnable call.
- [ ] No claim elsewhere in the doc contradicts the new option.
```

Note the cross-references that make it a contract, not three loose tasks: every Code branch has a matching Tests scenario; the Docs usage example is the Code delta's runnable call; every DoD item ties to a contract artifact. `worker` ticks each `[ ]` only with cited evidence, and the task header + top aggregate flip to `[x]` only when every item under them is `[x]`.

Run the prime handoff gate; friction signals: intake missing scope/citations you had to re-derive by re-reading source → `feedback` (the entry-skill handoff format should enforce completeness); delta that broke a caller found late in Phase 5 → `memory` (recallable: changing X breaks caller Y); unit split obviously wrong in hindsight → `feedback` (split heuristic didn't resolve — sharpen Phase 1).

## Self-check

Cross-module callers checked for every public delta (call-site grep + the grep-blind mirrors in Phase 2); each task executable from this plan alone by someone who never saw the intake; every DoD item tied to a contract artifact with no orphans; every file a true independently-shippable unit; every `depends_on` references a real sibling and is a true hard dep; N>1 → index.md exists with `[ ]` aggregate + sibling links; test files named per `guides/tests.md`; multi-branch Code delta → Tests scope can actually reach the coverage DoD.
