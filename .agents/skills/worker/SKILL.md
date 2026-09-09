---
name: worker
description: >
  Execute a plan task-by-task, faithfully. Respect inter-file dependencies (refuse to start a file whose deps are unfinished), verify each task is needed, enforce the surface fork gate, establish a green baseline, make the change, run type-appropriate verification, and tick each Definition of Done only with cited evidence — no note, no tick; on completion, runs the tiered audit/critic pipeline with a one-pass in-contract redo. Plan-file runs execute inside a per-component worktree seeded by `worktree.mjs` (provision or re-enter the named slug; inline plans run in-tree) and end delivered for merge. Use when working through a plan or contract produced by the `plan` skill, or any explicit task-contract with binary checks. Use ONLY when such a contract exists.
---

# Worker

Execute a plan task-by-task. The plan is the contract: shared scope + typed tasks, each with Strategy and a binary DoD. Verify everything — never assume a task is correct. Project rules (guides, lint, config) are the source of truth, not a passing typecheck; green does not override a rule violation. On verification failure: debug methodically (isolate, read the full error, one-line hypothesis, root cause, re-verify) — never patch symptoms. Governed by prime.

## Step 0 — Dependency gate (if the plan file has deps)

Frontmatter `depends_on: [sibling, ...]` → resolve each to a sibling file in the folder, read its top marker. Any dep still `[ ]` → **blocked**: don't start; report "blocked on <dep>"; pick an unblocked file or hand back to the orchestrator. Never execute a blocked file; never tick around a missing dep.

Then slice vertically: finish the current unit — every task ticked, top marker `[x]` — before starting a sibling. Horizontal (type-)batching defeats the unit boundary; only a hard `depends_on` block justifies setting a unit down mid-flight.

**Component partition (multi-file sets).** Partition the set into dependency-connected components (transitive `depends_on` closure). One component worktree per component (Step 1½); units run sequentially inside it in `depends_on` order. Components may run in parallel iff no cross-component `depends_on` edge AND their Files lists are disjoint beyond the carry-set (plan-set folder and `memory/` are protocol-owned shared state, excluded). Never edit the set's `index.md` inside a worktree — carried copies are stale; `bun merge` recomputes the aggregate.

Inline plan / no frontmatter / no deps → skip this gate (single-unit plan).

## Step 1 — Read the contract, run the fork gate, verify the task is needed

### Fork gate (before any work)

Parse the scope block. **Surface: yes** → Code + Tests + Docs tasks must all exist. One exception: a Docs view concluding "no change needed" that cites doc files already stating the target contract — verify the citations against the files (verified citations satisfy the gate; the coverage exists). Missing task without that exception, or citations that don't verify → structurally invalid: leave every box `[ ]`, note *"Surface: yes but missing [Tests|Docs] task — invalid plan, return to `plan`"*, stop. **Surface: no** → Tests-view and Docs-view must carry cited reasoning; either absent → same rejection. Fork violation → back to `plan`, never forward.

### Verify the task is needed

- **Already correct** (desired state exists) → no change; confirm checks pass; tick every DoD `[x]` citing evidence.
- **Valid, work needed** → Step 2.
- **Invalid** (premise wrong / Strategy conflicts with project rules) → leave every box `[ ]`, note exactly why. Never silently skip.

## Step 1½ — Provision the component worktree (plan-file runs)

Plan-file runs execute in an isolated worktree — the main tree routinely holds unrelated in-flight units that must never leak into execution or baseline, and rollback of a component is then just `clean`. Inline plans skip this step, run in-tree.

**Slug.** Orchestrated runs receive it in the prompt. Standalone whole-set sessions derive it from the Step 0 partition: set slug (set folder path, `-`-joined) + the component's first unit stem.

**Re-enter before provisioning.** Check `worktree.mjs list` / `status <slug>`: an existing worktree with that slug, a recorded baseline, and this set's plan folder carried → re-enter and continue — ticks in its unit copies are durable progress, never redone. Key on the slug (under split mode several worktrees carry the full set folder). Never provision a duplicate — `new` refuses on collision by design.

**Provision.** `bun .agents/skills/worker/scripts/worktree.mjs new <slug> --plans <set-folder>` (base `v2` default). Cuts clean from the base, carries exactly the plan-set folder (never committed, so a cut has none) and the uncommitted `memory/` delta, records the post-seed baseline; `diff`/`commit` are baseline-relative, so unchanged carries are invisible.

**Inside the worktree** (`../hellajs-wt/<slug>/`): every remaining step executes there — paths, edits, and verification address the worktree (`cd ../hellajs-wt/<slug> && bun coverage <pkg>`); ticks land on the worktree's unit copy. Never commit inside (staging permitted — `diff` needs it); never edit the set's `index.md`.

## Step 2 — Establish a green baseline, then execute per type

Green baseline first — any red afterward is attributable to your change. Baseline red → stop and report; never layer changes on a broken start. DoD items are the primary contract; the type-floor is the safety net for checks a weak DoD omits.

Verification commands are fixed by AGENTS.md §Scripts + §Testing — never bare `bun test` (packages test against `dist/`; `bun coverage` rebuilds it first):

| Type | Baseline | Verification floor after |
|---|---|---|
| **Code/Tests** (`packages/*`) | `bun coverage <pkg>` | DoD green; guides' structural rules hold on changed files (rules coverage can't see → the matching `audit-*` skill); new/changed exports documented; backward compatible or a migration note exists |
| **Code/Tests** (`plugins/*`) | `bun test plugins/<p>/tests` + `bun lint` (coverage cannot scope plugins — `guides/tests.md` §Triage & Gate Semantics) | DoD green; same floor |
| **Docs** | cross-check examples against current source | examples resolve; `bun lint:structure` when mdx touched; no claim contradicts the implementation |
| **Config / agent files** | the runnable checks the plan names (`bun lint`, guards as applicable) | checks pass; referenced scripts still resolve |

Docs-only changes skip typecheck/lint/coverage — they verify code, not prose. A scoped run failing on files outside the target package is foreign, not yours — `guides/tests.md` §Triage & Gate Semantics.

## Step 3 — Contract-consistency gate, then tick honestly

### Contract-consistency gate (before ticking)

- **Code (Surface: yes)** — implemented signatures match the plan's delta verbatim; every file touched as specified.
- **Tests** — every scenario has a corresponding test, no more, no less.
- **Docs** — every doc update produced the specified content; delta signatures appear verbatim.

Mismatch = unticked box. Fix the implementation to match the contract, or — if the contract is wrong — return to `plan`. Never tick a box that papers over a mismatch.

### Tick honestly

Plan is a file → edit it: rewrite each `[ ]` to `[x]` inline with its evidence note. Inline plan → record ticks + evidence in the response.

Each tick: `[x]` + a short note citing evidence — command + exit status, or file + symbol anchor cross-checked (never line numbers). Example: `[x] \`bun coverage core\` exits 0 — verified`. **No note, no tick.** A DoD item phrased as a predicted result is untickable by construction — the trap list is `plan` Phase 3; a DoD violating it goes back to `plan`.

Task header `## [ ] Task` → `## [x] Task` only when every DoD is `[x]` and the consistency gate passed. After ticking, recompute: zero `[ ]` task headers → top marker flips `[x]`.

**Set aggregate (multi-file set):** after completing this file, scan every sibling's top marker; all `[x]` → flip `index.md`'s top marker. Worktree runs never do this — the `bun merge` runner recomputes.

## Step 4 — Blast-radius check

Before declaring done: nothing outside touched files regressed — run checks in every module importing a changed symbol; coverage not below baseline; no doc contradicts code; no sibling test asserts dead behavior.

## Step 5 — Completion pipeline and report

Fires mechanically once the unit's tasks are ticked — no offering. Order fixed: the matching `audit-*` skill → redo → critic → feedback → memory.

- **(a) audit** — run the matching `audit-*` skill on the changed files of every task (Code → `audit-code`, Tests → `audit-tests`, Docs → `audit-docs`, scripts/config → `audit-scripts`; enforcement point for structural rules `bun coverage` cannot see).
- **(b) Redo pass, ONE.** In-contract findings (changed files, behavior inside the planned delta) → fix, re-run the gate. Scope-expanding or contract-contradicting → return to `plan`. Critic taste findings → `plan` with evidence, never self-redone. A needed second pass → stop and report.
- **(c) critic** — when Surface:yes, on the changed surface after the redo pass (it sees fixed state); findings hand to `plan`.
- **(d) feedback** — invoke; a clean run no-ops.
- **(e) memory** — events as they fire.
- **(f) Report** — per-task status: done, already-correct, rejected (reason), or structurally-invalid. Plan file → carries every tick + evidence. Confirm: blast radius checked; set aggregate updated; every tick evidence-backed; type-appropriate verification actually ran. Any gap → not done.
- **(g) Delivery (worktree runs)** — the report names the component's slug and hands off to `bun merge <set-folder>` (the single human checkpoint; the merge runner owns the commit). Blast radius ran inside the worktree; main-tree blast radius is the merge runner's.

Run the prime handoff gate; highest-friction skill in the loop — evaluate the `feedback` trigger table literally: verification failure + the fix that worked → `memory`; wrong plan assumption deviated from → `memory`; rework from a symptom-patch → `feedback`; verification command hard to find → `memory`; repeated failure pattern across runs → `feedback`.
