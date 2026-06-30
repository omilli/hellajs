---
name: brain-worker
description: >
  Execute a plan task-by-task, faithfully. Respect inter-file dependencies (refuse to start a file whose deps are unfinished), verify each task is needed, enforce the surface fork gate, establish a green baseline, make the change, run type-appropriate verification, and tick each Definition of Done only with cited evidence — no note, no tick. Use when working through a plan or contract produced by the `brain-plan` skill, or any explicit task-contract with binary checks. Use ONLY when such a contract exists.
---

# Worker

Execute a plan task-by-task. The plan is the contract: a shared scope block and typed tasks each carrying a Strategy and a binary Definition of Done. Decide whether each task is valid, enforce the structural gates, make the change, verify against type-appropriate checks, and tick honestly. Do not assume any task is correct — verify everything.

The project's own rules (lint, style, config conventions) are the source of truth, not a passing typecheck. A green check does not override a rule violation, because rules encode decisions the toolchain cannot detect. Two non-negotiables govern this skill (see `brain-prime`): rules inviolable (a conflict halts with a surfaced proposal, never a silent workaround) and full blast radius (a change green in its own module but breaking a caller, test, or doc elsewhere is not done).

brain-plan produces the contract; brain-worker executes it. If verification fails, debug methodically — isolate the failure, read the full error, form a one-line hypothesis, fix the root cause, re-verify — rather than patching symptoms.

## Step 0 — Dependency gate (if the plan file has deps)

If the plan file carries frontmatter `depends_on: [sibling, ...]`, resolve each name to a sibling file in the same folder and read its top marker. If any dep's top marker is still `[ ]`, this file is **blocked**: do not start it. Report "blocked on <dep>" and either pick an unblocked file from the set or hand back to the orchestrator. A dep flipping to `[x]` unblocks it. Never execute a blocked file, and never tick around a missing dep.

If the plan is inline (not a file), has no frontmatter, or lists no deps, skip this gate — it is a single-unit plan.

## Step 1 — Read the contract, run the fork gate, verify the task is needed

### Fork gate (before any work)

Parse the plan's scope block.

- **Surface change: yes** → verify Code + Tests + Docs tasks all exist. If any is missing, the plan is structurally invalid: leave every box `[ ]`, note *"Surface change: yes but missing [Tests|Docs] task — invalid plan, return to `brain-plan`"*, and stop. Do not execute a partial scope — a surface change with no tests ships untested behavior, with no docs an undocumented one.
- **Surface change: no** → verify the plan carries **Tests-view** and **Docs-view** with cited reasoning. If either is absent, same rejection — these exist precisely so a lone Code task cannot smuggle through an unconsidered test or doc impact.

A plan that violates the fork goes back to `brain-plan`, never forward to execution.

### Verify the task is needed

Before any work, assess truthfulness. Three outcomes:

- **Already correct** — the desired state already exists. Make no change, confirm checks pass, tick every DoD item `[x]` with a comment citing the evidence (file:line, command output).
- **Valid, work needed** — proceed to Step 2.
- **Invalid** — the premise is wrong or the Strategy conflicts with project rules. Leave every box `[ ]` and note exactly why. Do not silently skip.

## Step 2 — Establish a green baseline, then execute per type

Before changing anything, establish a green baseline so any red afterward is attributable to your change, not inherited. If the baseline is red, stop and report — do not layer changes on a broken start.

Find the project's verification commands (typecheck, lint, test, coverage, build). If you cannot find them, ask — do not skip the gate and do not guess. The plan's DoD items are the primary contract you tick; the type-floor below is a safety net for checks a weak DoD might omit.

| Type | Baseline before | Verification floor after |
|---|---|---|
| **Code** | typecheck + lint for the affected module | project rules hold on changed files; new/changed exports documented per convention; backward compatible or a migration note exists |
| **Tests** | test run + coverage (if tracked) | new tests pass; coverage on changed lines (if tracked); each test asserts a behavior the source actually exposes |
| **Docs** | cross-check examples against current signatures | examples resolve against current source; correct template/conventions used; no claim contradicts the implementation |
| **Config** | typecheck + lint + build (if build tooling touched) | config parses; build still works; no rule contradicts project conventions; referenced scripts still resolve |

Docs-only changes skip typecheck/lint/coverage entirely — those verify code, not prose; running them adds noise.

Make the change in the task's Strategy, then verify against the DoD items plus the type-floor.

## Step 3 — Contract-consistency gate, then tick honestly

### Contract-consistency gate (before ticking)

- **Code task (Surface: yes)** — implemented signatures match the plan's delta verbatim. Every file in the plan was touched as specified.
- **Tests task** — every scenario in the plan has a corresponding test. No more, no less — an extra test asserts something the contract did not scope; a missing one leaves a scenario uncovered.
- **Docs task** — every doc update produced the specified content. Delta signatures appear verbatim.

A mismatch is an unticked box, not a tick. Fix the implementation to match the contract, or — if the contract itself is wrong — return to `brain-plan`. Do not tick a box that papers over a mismatch.

### Tick honestly

If the plan is a file, edit it — rewrite each `[ ]` to `[x]` inline with its evidence note. The plan file is the durable record. If the plan was given inline (not a file), record ticks and evidence in your response.

For each DoD item you verified, tick `[x]` and append a short note citing the evidence — the command and its exit status, or the file:line you cross-checked. Example: `[x] \`tsc --noEmit\` exits 0 — verified`. **No note, no tick.**

A task header `## [ ] Task` becomes `## [x] Task` only when every DoD item is `[x]` and the consistency gate passed. If even one item is unmet or unverifiable, the header stays `[ ]`. There is no third marker. After ticking, recompute the aggregate: if zero `[ ]` task headers remain, the plan's top marker flips to `[x]`; otherwise it stays `[ ]`.

**Update set aggregate (if multi-file set):** If the same folder contains an `INDEX.md`, read it to identify sibling files. After completing this file, scan every sibling's top marker. If all siblings are now `[x]`, update `INDEX.md`'s top marker from `[ ]` to `[x]`. This makes the set-level status visible at a glance.

## Step 4 — Blast-radius check and report

Before declaring the plan done, verify nothing outside the touched files regressed: run checks in every module whose code imports a changed symbol, not just the task's; coverage not below baseline; no doc now contradicts code; no sibling test now asserts dead behavior.

Run the self-improvement track (`brain-prime` handoff gate) before closing. This skill is the highest-friction skill in the loop — its signals fire often: a verification failure and the fix that worked, a wrong assumption in the plan you had to deviate from, rework caused by a symptom-patch instead of a root-cause fix, or a verification command that was hard to find. The first two are classic memory events (the retry-after-failure and the confirmed-against-source patterns); a repeated failure pattern is a feedback event. A non-obvious project fact confirmed this run (test command shape, build idiosyncrasy, coverage tool quirk) is a memory event. Invoke `brain-feedback` (rule change) or `brain-memory` (recallable fact) yourself; do not make the user ask.

Report a brief per-task status — done, already-correct, rejected (with reason), or structurally-invalid (returned to brain-plan). If the plan was a file, the file itself now carries every tick and its evidence. If it was inline, include the ticked plan in the report. Then the self-check:

a. Did I run the fork gate before any work?
b. Did I establish a green baseline (or correctly skip it for docs-only)?
c. Did the contract-consistency gate pass — does the implementation match the contract that scoped it?
d. Is every tick backed by evidence I cited inline?
e. Did the type-appropriate verification actually pass, or did I assume it?
f. Did I check the blast radius — green in every affected module, not just the task's?
g. If the file had `depends_on`, did I run the dependency gate and refuse to start while a dep was unfinished?
h. For multi-file sets (INDEX.md present), did I update the set aggregate after the last file?
i. Did I route friction (verification failures, rework, wrong assumptions) and durable facts to `brain-feedback`/`brain-memory` instead of leaving it for the user to invoke?

If any answer is no, the task is not done.
