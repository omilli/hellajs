---
name: brain-plan
description: >
  Lay out a plan — one or more tracked, verifiable contracts (files to touch, binary Definitions of Done, blast radius, hard inter-file deps) — before executing non-trivial work. Use when work spans multiple steps or files, when you want a reviewable spec before implementation, or when handed evidence maps from discovery (brain-idea/brain-audit/brain-feature). Produces one file per independently-shippable unit. Use ONLY for non-trivial work; a one-line fix skips planning entirely.
---

# Plan

Turn a goal — or evidence map(s) handed up from discovery — into one or more plan files: contracts the `brain-worker` skill executes by ticking `[ ]` to `[x]`. Each file is one independently-shippable unit; units that depend on each other declare it in frontmatter (`depends_on`). The plan exists because "plan in your head, then edit" is where wrong-root-cause fixes and missed blast radii are born. Writing the contract forces the design and its full scope into the open before any code changes.

brain-plan produces the artifact; `brain-worker` executes it. `brain-idea` may precede planning (decide *what* before structuring *how*); if `brain-worker`'s verification fails, debug methodically (isolate the failure, form a one-line hypothesis, fix the root cause, re-verify) rather than patching symptoms. Two non-negotiables govern this skill (see `brain-prime`): rules inviolable (surface conflicts, never silent workarounds) and full blast radius.

## The escape hatch

A single obvious edit does not need a plan — say so, make the change, verify, stop. Planning is for work where the scope, the blast radius, or the design is non-trivial. Do not formalize trivia.

## Phase 0 — Intake

Receive a plain goal, a single evidence map, or a set of evidence maps from discovery. If evidence map(s), verify each carries:

- **Gap** — one sentence: the target state (what is missing or wrong, phrased as what will be true).
- **Scope hint** — where the change lives: `surface` (a public/exported symbol or a consumed contract) / `internal` / `docs` / `config` / `tests`. Plan re-verifies `surface` by reading the project's public exports; it does not trust the hint blindly.
- **Citations** — one or more `{ file, anchor, what-it-shows }`. Anchors are function/type/heading names, not line numbers — names survive edits.
- **Type tag** — Code / Tests / Docs / Config.

If scope or citations are missing, ask before proceeding. Do not plan into fog — every open question becomes a wrong assumption in the contract.

## Phase 1 — Decompose into shippable units

Before any per-unit work, decide how many plan files this intake produces. **One file = one independently-shippable unit**: a change that could land and revert alone with the repo green and coherent. The blast-radius boundary is the split boundary.

- Cluster the intake's evidence maps / sub-goals by shared blast radius. Two changes that touch the same files, or where one is incorrect or not-green without the other, are ONE unit. Two changes with independent blast radii are SEPARATE units.
- A Surface:yes change's Code+Tests+Docs (Phase 3) are one atomic unit — never split across files.
- Don't over-split: if two units must land atomically (the repo is red or incoherent with only one), they are one unit. Don't under-split: a file with many tasks almost always means distinct units glued together — split them so each can be tracked, reviewed, and reverted independently.
- Trivia (a single obvious edit) still uses the escape hatch, not a file.

Outcome: a set of 1..N units. N=1 → Phases 2–5 run once, producing one file. N>1 → Phases 2–4 run once per unit, producing sibling files in one shared `plans/<package>/<category>/<topic>/` folder, and Phase 5 stitches the set together with dependencies.

## Phase 2 — Surface fork (per unit)

Determine whether the work changes the project's public surface: any exported symbol, any field on a type callers pass, any publicly consumed signature or documented behavior. This is factual — read the public exports (barrel, package entry, module index — whatever the project uses) and the cited types. Do not guess from the goal description.

- `yes` → the change has three views that must land together: **Code** + its **Tests** + its **Docs**. Scope all three.
- `no` → a single task of the matching type. Tests-view and Docs-view fields still appear and justify the absence with a cited reason ("internal helper, not exported; existing tests cover the public surface").

If the project has no notion of a public surface (scripts, scratch work, one-off tooling), Surface change is `no` by definition — skip the export read.

## Phase 3 — Contract crystallization

Derive each artifact by applying the project's own rules (lint, style, config conventions — the project's equivalent of a style guide), not authorial intuition. The artifact is the output of that application:

- **Files** — each file to touch, with a content anchor (function/type/heading name + relative position), not a line number.
- **The change / delta** — for Surface change: yes, the exact signature/shape change, plus one runnable usage example (if you cannot write the call, the design is wrong — and the example seeds the Docs task).
- **Behavioral scenarios** (if tests in scope) — each scenario is one behavior, phrased as one test, so `brain-worker` transcribes compliant tests without re-deciding structure.
- **Doc updates** (if docs in scope) — which file/section owns this, what content extends it.
- **Definitions of Done** — binary items, each tied to a contract artifact: every Files entry → a DoD item; every scenario → a DoD item; every doc update → a DoD item; every delta line → a DoD item. The DoD is an exhaustive mirror of the contract — nothing in the contract goes unchecked.

## Phase 4 — Strategy per task

For each task, 2–4 sentences: the approach, the key decisions, the trade-offs considered and rejected. This is where design judgment lives so `brain-worker` does not re-exercise it. Keep it short — advisory, not a parse target. Add a short example if this is a user facing or API change.

## Phase 5 — Cross-task consistency and blast radius

Before finalizing:

- Every code change has matching scenarios.
- Every public delta is reflected in doc updates.
- Dependencies are ordered (Code before Tests before Docs; Config wherever its tooling demands).
- Inter-file dependencies: when one unit is incorrect or not-green unless another has landed, the dependent file declares it in frontmatter `depends_on: [sibling-basename, ...]`. Hard deps only — the repo must be red or incoherent without the dep. Soft ordering preference stays in Strategy prose, not the contract. Basenames resolve within the same topic folder.
- Cross-module callers checked: for every public delta, find importers of the changed symbol across the repo. A broken caller adds a task in that module, or the delta is backward-compatible by construction.

Mismatches go back to Phase 3.

## Phase 6 — Propose, then hand to brain-worker

Present the plan set. When a project `plans/` directory exists, write one file per unit to `plans/<package>/<category>/<topic>/<unit>.md` (folder per topic; unit-named files), each carrying frontmatter `depends_on:` if it has hard deps, and link the set inline; inline-only is the fallback when no such directory exists. State the dependency graph across the set.

For multi-file sets (N>1), also write `plans/<package>/<category>/<topic>/INDEX.md` with a top-level `# [ ] Plan set: <topic>` aggregate, the set's shared scope, and a bullet list linking each sibling file with a one-line description and its hard deps. This is the set-level entry point — `brain-worker` updates the aggregate as files are completed.

On approval, hand off to the `brain-worker` skill — do not execute the tasks yourself unless the change was small enough to have used the escape hatch.

## Self-check

a. Does every contract artifact cite a source read this session (no claims carried from memory)?
b. For Surface change: yes, do Code + Tests + Docs tasks all exist, sharing one contract?
c. For Surface change: no, do Tests-view and Docs-view carry cited reasoning for their absence?
d. Is every DoD item tied to a contract artifact, with no orphan checks?
e. Were cross-module callers checked for every public delta?
f. Could someone who never saw the intake execute each task from this plan alone? If not, the contract is incomplete.
g. Is every file a single independently-shippable unit — no distinct units glued together, no atomic unit (e.g. a Surface:yes Code+Tests+Docs) over-split?
h. Does every `depends_on` reference a real sibling file, and is each a true hard dep (the file is incorrect or not-green without it)?
i. For multi-file sets (N>1), does an INDEX.md exist with the `[ ]` aggregate and sibling links?
