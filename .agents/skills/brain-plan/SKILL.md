---
name: brain-plan
description: >
  Lay out a plan — one or more tracked, verifiable contracts (files to touch, binary Definitions of Done, blast radius, hard inter-file deps) — before executing non-trivial work. Use when work spans multiple steps or files, when you want a reviewable spec before implementation, or when handed evidence maps from discovery (brain-idea/brain-audit/brain-critic/brain-feature). Produces one file per independently-shippable unit. Use ONLY for non-trivial work; a one-line fix skips planning entirely.
---

# Plan

Turn a goal — or evidence map(s) from discovery — into plan files: contracts `brain-worker` executes by ticking `[ ]` to `[x]`. One file = one independently-shippable unit; inter-dependent units declare it in frontmatter (`depends_on`). brain-plan produces the artifact; `brain-worker` executes it. `brain-idea` may precede (decide *what* before *how*); on `brain-worker` verification failure, debug methodically (isolate, one-line hypothesis, root cause, re-verify), don't patch symptoms. Governed by brain-prime.

## Escape hatch

Single obvious edit → no plan. Say so, make the change, verify, stop. Don't formalize trivia.

## Phase 0 — Intake

Plain goal, one evidence map, or a set of them. If evidence map(s), verify each carries:

- **Gap** — one sentence: target state (what's missing/wrong, phrased as what will be true).
- **Scope hint** — `surface` (public/exported symbol or consumed contract) / `internal` / `docs` / `config` / `tests`. Plan re-verifies `surface` by reading public exports; doesn't trust the hint.
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

Does the work change the project's public surface (any exported symbol, any field on a type callers pass, any publicly consumed signature or documented behavior)? Factual — read the public exports (barrel, entry, module index) and cited types. Don't guess from the goal.

- `yes` → three views landing together: **Code** + **Tests** + **Docs**. Scope all three.
- `no` → one task of the matching type. Tests-view and Docs-view still appear, justifying absence with a cited reason ("internal helper, not exported; existing tests cover the public surface").

No notion of public surface (scripts, scratch, one-off tooling) → Surface `no` by definition; skip the export read.

## Phase 3 — Contract crystallization

Derive each artifact by applying the project's own rules (lint, style, config conventions), not authorial intuition:

- **Files** — each file to touch, with a content anchor (function/type/heading + relative position), not a line number.
- **Change / delta** — for Surface: yes, the exact signature/shape change + one runnable usage example (if you can't write the call, the design is wrong; the example seeds the Docs task).
- **Behavioral scenarios** (if tests in scope) — one behavior per scenario, phrased as one test, so `brain-worker` transcribes without re-deciding structure.
- **Doc updates** (if docs in scope) — which file/section owns this, what content extends it.
- **Definitions of Done** — binary items, each tied to a contract artifact: every Files entry → DoD item; every scenario → DoD item; every doc update → DoD item; every delta line → DoD item. DoD is an exhaustive mirror of the contract — nothing goes unchecked.

## Phase 4 — Strategy per task

2–4 sentences per task: approach, key decisions, trade-offs considered and rejected. Where design judgment lives so `brain-worker` doesn't re-exercise it. Short — advisory, not a parse target. Add a short example if user-facing/API.

## Phase 5 — Cross-task consistency and blast radius

Before finalizing:

- Every code change has matching scenarios.
- Every public delta reflected in doc updates.
- Deps ordered (Code before Tests before Docs; Config wherever its tooling demands).
- Each unit is a vertical slice — its Code+Tests+Docs land and ship together. Resist horizontal (type-)batching across siblings: writing every unit's Code, then every unit's Tests, then every unit's Docs leaves half-built slices that can't ship or revert alone and buries integration failure until the end. Unit-at-a-time is the model; `brain-worker` finishes one slice before starting the next.
- Inter-file deps: when one unit is incorrect/not-green unless another has landed, the dependent declares `depends_on: [sibling-basename, ...]`. **Hard deps only** — repo must be red/incoherent without it. Soft ordering stays in Strategy prose. Basenames resolve within the same topic folder.
- Cross-module callers checked: for every public delta, find importers across the repo. A broken caller adds a task in that module, or the delta is backward-compatible by construction.
- Test filenames/surfaces obey the project's test-naming guide — read it; name after the surface it prescribes, not the plan topic.
- Coverage DoD reachable from Tests scope: a multi-branch Code delta (retry/abort/parse loops, validation throws) needs enough tests to hit stated coverage. Can't reach DoD → widen Tests or relax DoD explicitly; an unsatisfiable contract is a defect.
- Surface inventories synced: adding/renaming/removing a public symbol updates the project's surface enumeration (AGENTS.md export/type tables, README API lists) — add a Files entry, or it goes stale.

Mismatches → back to Phase 3.

## Phase 6 — Propose, then hand to brain-worker

Present the plan set. When a project `plans/` dir exists, write one file per unit to `plans/<package>/<category>/<topic>/<unit>.md` (folder per topic; unit-named files), each with frontmatter `depends_on:` if it has hard deps, and link the set inline; inline-only is the fallback when no such dir exists. State the dep graph.

For N>1, also write `plans/<package>/<category>/<topic>/INDEX.md`: top-level `# [ ] Plan set: <topic>` aggregate, shared scope, and a bullet list linking each sibling with a one-line description + hard deps. Set-level entry point — `brain-worker` updates it as files complete.

On approval, hand to `brain-worker` — don't execute tasks yourself unless small enough to have used the escape hatch.

## Worked example

Illustrative contract (synthetic; N=1, no hard deps — frontmatter omitted). Shows the Surface:yes fork landing Code+Tests+Docs as one atomic unit, each task carrying Files/Delta/Strategy and a binary DoD `brain-worker` ticks.

```
# [ ] Add `timeout` option to `fetchUser`

## Scope
- Gap: `fetchUser(id)` has no timeout; callers cannot bound latency.
- Surface: yes — re-exported by `src/index.ts`; an optional param changes the public signature.
- Type: Code + Tests + Docs (atomic — Surface:yes).

## [ ] Code
Files: `src/api/fetchUser.ts` — `fetchUser` signature.
Delta: `fetchUser(id: string, opts?: { timeout?: number }): Promise<User>` — Promise.race the fetch against a rejection timer when `timeout` is set.
Strategy: Options bag, not a positional param, so future options don't shift arity. Default unset preserves existing behavior. Runnable usage: `fetchUser("u1", { timeout: 5000 })`.

- [ ] Accepts `opts.timeout`, applies via `Promise.race`.
- [ ] Omitting `opts` or `opts.timeout` preserves existing behavior (no timer).
- [ ] On timeout, rejects with a named `TimeoutError`.

## [ ] Tests
Files: `src/api/fetchUser.test.ts`.

- [ ] Resolves normally when `timeout` unset (existing test still passes).
- [ ] Rejects with `TimeoutError` when fetch exceeds `timeout`.
- [ ] Resolves when fetch beats `timeout` (timer cleared, no leak).

## [ ] Docs
Files: `README.md` §API — `fetchUser` row; `docs/api.md` §`fetchUser`.

- [ ] Signature shows `opts.timeout`, default noted as unset.
- [ ] One usage example matching the Code delta's runnable call.
- [ ] `TimeoutError` behavior documented.
```

Note the cross-references that make it a contract, not three loose tasks: every Code branch has a matching Tests scenario; the Docs usage example is the Code delta's runnable call; every DoD item ties to a contract artifact. `brain-worker` ticks each `[ ]` only with cited evidence, and the task header + top aggregate flip to `[x]` only when every item under them is `[x]`.

Run the brain-prime handoff gate; friction signals: intake missing scope/citations you had to re-derive by re-reading source → `brain-feedback` (upstream handoff format should enforce completeness); delta that broke a caller found late in Phase 5 → `brain-memory` (recallable: changing X breaks caller Y); unit split obviously wrong in hindsight → `brain-feedback` (split heuristic didn't resolve — sharpen Phase 1).

## Self-check

Cross-module callers checked for every public delta; each task executable from this plan alone by someone who never saw the intake; every DoD item tied to a contract artifact with no orphans; every file a true independently-shippable unit (no distinct units glued, no over-split atomic Surface:yes Code+Tests+Docs); every `depends_on` references a real sibling and is a true hard dep (repo red/incoherent without it); N>1 → INDEX.md exists with `[ ]` aggregate + sibling links; test files named after surface per the test-naming guide; multi-branch Code delta → Tests scope can actually reach the coverage DoD.
