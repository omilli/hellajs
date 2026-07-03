---
name: brain-worker
description: >
  Execute a plan task-by-task, faithfully. Respect inter-file dependencies (refuse to start a file whose deps are unfinished), verify each task is needed, enforce the surface fork gate, establish a green baseline, make the change, run type-appropriate verification, and tick each Definition of Done only with cited evidence — no note, no tick. Use when working through a plan or contract produced by the `brain-plan` skill, or any explicit task-contract with binary checks. Use ONLY when such a contract exists.
---

# Worker

Execute a plan task-by-task. The plan is the contract: shared scope block + typed tasks each carrying a Strategy and a binary Definition of Done. Decide whether each task is valid, enforce the structural gates, make the change, verify against type-appropriate checks, tick honestly. Don't assume any task is correct — verify everything. Project rules (lint, style, config) are the source of truth, not a passing typecheck; a green check does not override a rule violation (rules encode decisions the toolchain can't detect). brain-plan produces the contract; brain-worker executes it. On verification failure: debug methodically (isolate, read the full error, one-line hypothesis, root cause, re-verify), don't patch symptoms. Governed by brain-prime.

## Step 0 — Dependency gate (if the plan file has deps)

Frontmatter `depends_on: [sibling, ...]` → resolve each to a sibling file in the same folder and read its top marker. Any dep's top marker still `[ ]` → this file is **blocked**: don't start it. Report "blocked on <dep>"; pick an unblocked file from the set or hand back to the orchestrator. A dep flipping to `[x]` unblocks. Never execute a blocked file; never tick around a missing dep.

Then slice vertically: in a multi-file set, finish the current unit — every task ticked, top marker `[x]` — before starting a sibling. Horizontal (type-)batching across units (all their Code, then all their Tests, then all their Docs) defeats the unit boundary: half-built slices can't ship or revert alone, and integration breaks surface late. Only a hard `depends_on` block justifies setting a unit down mid-flight.

Inline plan (not a file), no frontmatter, or no deps → skip this gate (single-unit plan).

## Step 1 — Read the contract, run the fork gate, verify the task is needed

### Fork gate (before any work)

Parse the plan's scope block.

- **Surface: yes** → verify Code + Tests + Docs tasks all exist. Any missing → structurally invalid: leave every box `[ ]`, note *"Surface: yes but missing [Tests|Docs] task — invalid plan, return to `brain-plan`"*, stop. Don't execute a partial scope — surface change with no tests ships untested behavior, with no docs an undocumented one.
- **Surface: no** → verify **Tests-view** and **Docs-view** carry cited reasoning. Either absent → same rejection (these exist so a lone Code task can't smuggle through an unconsidered test/doc impact).

Fork violation → back to `brain-plan`, never forward to execution.

### Verify the task is needed

Three outcomes:

- **Already correct** — desired state exists. No change; confirm checks pass; tick every DoD `[x]` with a comment citing evidence (file:line, command output).
- **Valid, work needed** → Step 2.
- **Invalid** — premise wrong or Strategy conflicts with project rules. Leave every box `[ ]`, note exactly why. Don't silently skip.

## Step 2 — Establish a green baseline, then execute per type

Green baseline first, so any red afterward is attributable to your change, not inherited. Baseline red → stop and report; don't layer changes on a broken start.

Find the project's verification commands (typecheck, lint, test, coverage, build). Can't find them → ask, don't skip the gate, don't guess. DoD items are the primary contract you tick; the type-floor below is a safety net for checks a weak DoD might omit.

| Type | Baseline before | Verification floor after |
|---|---|---|
| **Code** | typecheck + lint for the affected module | project rules hold on changed files; new/changed exports documented per convention; backward compatible or a migration note exists |
| **Tests** | test run + coverage (if tracked) | new tests pass; coverage on changed lines (if tracked); each test asserts a behavior the source actually exposes |
| **Docs** | cross-check examples against current signatures | examples resolve against current source; correct template/conventions; no claim contradicts the implementation |
| **Config** | typecheck + lint + build (if build tooling touched) | config parses; build still works; no rule contradicts conventions; referenced scripts still resolve |

Docs-only changes skip typecheck/lint/coverage — those verify code, not prose; running them adds noise.

Make the change per the Strategy, then verify against DoD items + type-floor.

## Step 3 — Contract-consistency gate, then tick honestly

### Contract-consistency gate (before ticking)

- **Code task (Surface: yes)** — implemented signatures match the plan's delta verbatim; every file in the plan touched as specified.
- **Tests task** — every scenario has a corresponding test, no more, no less (extra = asserts something unscoped; missing = scenario uncovered).
- **Docs task** — every doc update produced the specified content; delta signatures appear verbatim.

Mismatch = unticked box, not a tick. Fix the implementation to match the contract, or — if the contract is wrong — return to `brain-plan`. Don't tick a box that papers over a mismatch.

### Tick honestly

Plan is a file → edit it: rewrite each `[ ]` to `[x]` inline with its evidence note (durable record). Inline plan → record ticks + evidence in your response.

For each verified DoD item: tick `[x]` + append a short note citing evidence — command + exit status, or the file:line cross-checked. Example: `[x] \`tsc --noEmit\` exits 0 — verified`. **No note, no tick.**

Task header `## [ ] Task` → `## [x] Task` only when every DoD is `[x]` and the consistency gate passed. Even one item unmet/unverifiable → header stays `[ ]`. No third marker. After ticking, recompute the aggregate: zero `[ ]` task headers → top marker flips to `[x]`; else stays `[ ]`.

**Set aggregate (multi-file set):** same folder has an `INDEX.md` → read it to find siblings. After completing this file, scan every sibling's top marker; all `[x]` → flip `INDEX.md`'s top marker `[ ]` → `[x]`.

## Step 4 — Blast-radius check and report

Before declaring done: nothing outside touched files regressed — run checks in every module whose code imports a changed symbol (not just the task's); coverage not below baseline; no doc now contradicts code; no sibling test now asserts dead behavior.

Run the brain-prime handoff gate; highest-friction skill in the loop — signals fire often: a verification failure + the fix that worked, a wrong plan assumption you deviated from, rework from a symptom-patch instead of root-cause, a verification command hard to find. First two are classic memory events (retry-after-failure, confirmed-against-source); a repeated failure pattern is a feedback event.

Report brief per-task status — done, already-correct, rejected (reason), or structurally-invalid (returned to brain-plan). Plan was a file → it now carries every tick + evidence; inline → include the ticked plan. Then:

a. Ran the fork gate before any work?
b. Established a green baseline (or correctly skipped for docs-only)?
c. Contract-consistency gate passed — implementation matches the contract?
d. Every tick backed by inline-cited evidence?
e. Type-appropriate verification actually passed, not assumed?
f. Blast radius checked — green in every affected module, not just the task's?
g. File had `depends_on` → ran the dep gate and refused to start while a dep was unfinished?
h. Multi-file set (INDEX.md present) → updated the set aggregate after the last file?
i. Multi-file set → finished each unit before starting a sibling (no horizontal type-batching across units)?

Any no → task not done.
