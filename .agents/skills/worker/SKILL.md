---
name: worker
description: >
  Execute a plan task-by-task, faithfully. Respect inter-file dependencies (refuse to start a file whose deps are unfinished), verify each task is needed, enforce the surface fork gate, establish a green baseline, make the change, run type-appropriate verification, and tick each Definition of Done only with cited evidence — no note, no tick. Use when working through a plan or contract produced by the `plan` skill, or any explicit task-contract with binary checks. Use ONLY when such a contract exists.
---

# Worker

Execute a plan task-by-task. The plan is the contract: shared scope block + typed tasks each carrying a Strategy and a binary Definition of Done. Decide whether each task is valid, enforce the structural gates, make the change, verify against type-appropriate checks, tick honestly. Don't assume any task is correct — verify everything. Project rules (guides, lint, config) are the source of truth, not a passing typecheck; a green check does not override a rule violation. plan produces the contract; worker executes it. On verification failure: debug methodically (isolate, read the full error, one-line hypothesis, root cause, re-verify), don't patch symptoms. Governed by prime.

## Step 0 — Dependency gate (if the plan file has deps)

Frontmatter `depends_on: [sibling, ...]` → resolve each to a sibling file in the same folder and read its top marker. Any dep's top marker still `[ ]` → this file is **blocked**: don't start it. Report "blocked on <dep>"; pick an unblocked file from the set or hand back to the orchestrator. A dep flipping to `[x]` unblocks. Never execute a blocked file; never tick around a missing dep.

Then slice vertically: in a multi-file set, finish the current unit — every task ticked, top marker `[x]` — before starting a sibling. Horizontal (type-)batching across units defeats the unit boundary. Only a hard `depends_on` block justifies setting a unit down mid-flight.

Inline plan (not a file), no frontmatter, or no deps → skip this gate (single-unit plan).

## Step 1 — Read the contract, run the fork gate, verify the task is needed

### Fork gate (before any work)

Parse the plan's scope block.

- **Surface: yes** → verify Code + Tests + Docs tasks all exist. Any missing → structurally invalid: leave every box `[ ]`, note *"Surface: yes but missing [Tests|Docs] task — invalid plan, return to `plan`"*, stop.
- **Surface: no** → verify **Tests-view** and **Docs-view** carry cited reasoning. Either absent → same rejection.

Fork violation → back to `plan`, never forward to execution.

### Verify the task is needed

Three outcomes:

- **Already correct** — desired state exists. No change; confirm checks pass; tick every DoD `[x]` with a comment citing evidence.
- **Valid, work needed** → Step 2.
- **Invalid** — premise wrong or Strategy conflicts with project rules. Leave every box `[ ]`, note exactly why. Don't silently skip.

## Step 2 — Establish a green baseline, then execute per type

Green baseline first, so any red afterward is attributable to your change, not inherited. Baseline red → stop and report; don't layer changes on a broken start. DoD items are the primary contract you tick; the type-floor below is a safety net for checks a weak DoD might omit.

Verification commands are fixed by AGENTS.md §Scripts + §Testing — never bare `bun test` (packages test against `dist/`, and `bun coverage` rebuilds it first, so the stale-bundle hazard is excluded by construction):

| Type | Baseline | Verification floor after |
|---|---|---|
| **Code/Tests** (`packages/*`) | `bun coverage <pkg>` | DoD green; guides' structural rules hold on changed files (rules coverage can't see → `audit`, §Testing); new/changed exports documented; backward compatible or a migration note exists |
| **Code/Tests** (`plugins/*`) | `bun test plugins/<p>/tests` + `bun lint` (coverage cannot scope plugins — §Testing) | DoD green; same floor |
| **Docs** | cross-check examples against current source | examples resolve against current source; `bun lint:structure` when mdx was touched; no claim contradicts the implementation |
| **Config / agent files** | the runnable checks the plan names (`bun sync`, `bun lint`, guards as applicable) | checks pass; referenced scripts still resolve |

Docs-only changes skip typecheck/lint/coverage — those verify code, not prose; running them adds noise. A scoped run failing on files outside the target package is foreign, not yours — §Testing scoped-run triage.

## Step 3 — Contract-consistency gate, then tick honestly

### Contract-consistency gate (before ticking)

- **Code task (Surface: yes)** — implemented signatures match the plan's delta verbatim; every file in the plan touched as specified.
- **Tests task** — every scenario has a corresponding test, no more, no less.
- **Docs task** — every doc update produced the specified content; delta signatures appear verbatim.

Mismatch = unticked box, not a tick. Fix the implementation to match the contract, or — if the contract is wrong — return to `plan`. Don't tick a box that papers over a mismatch.

### Tick honestly

Plan is a file → edit it: rewrite each `[ ]` to `[x]` inline with its evidence note (durable record). Inline plan → record ticks + evidence in your response.

For each verified DoD item: tick `[x]` + append a short note citing evidence — command + exit status, or the file + symbol anchor cross-checked (never line numbers — they rot on the next refactor). Example: `[x] \`bun coverage core\` exits 0 — verified`. **No note, no tick.**

Task header `## [ ] Task` → `## [x] Task` only when every DoD is `[x]` and the consistency gate passed. Even one item unmet/unverifiable → header stays `[ ]`. No third marker. After ticking, recompute the aggregate: zero `[ ]` task headers → top marker flips to `[x]`; else stays `[ ]`.

**Set aggregate (multi-file set):** same folder has an `index.md` → read it to find siblings. After completing this file, scan every sibling's top marker; all `[x]` → flip `index.md`'s top marker `[ ]` → `[x]`.

## Step 4 — Blast-radius check and report

Before declaring done: nothing outside touched files regressed — run checks in every module whose code imports a changed symbol (not just the task's); coverage not below baseline; no doc now contradicts code; no sibling test now asserts dead behavior.

Run the prime handoff gate; highest-friction skill in the loop — signals fire often: verification failure + the fix that worked → `memory` (retry-after-failure); wrong plan assumption you deviated from → `memory` (confirmed-against-source); rework from a symptom-patch instead of root-cause → `feedback` (root-cause discipline slipped); verification command hard to find → `memory` (record it); a repeated failure pattern across runs → `feedback`.

Report brief per-task status — done, already-correct, rejected (reason), or structurally-invalid (returned to plan). Plan was a file → it now carries every tick + evidence; inline → include the ticked plan. Then confirm: blast radius checked; multi-file set → set aggregate updated and each unit finished before starting a sibling; every tick backed by inline-cited evidence; type-appropriate verification actually ran, not assumed. Any gap → task not done.
