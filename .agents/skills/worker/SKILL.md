---
name: worker
description: Execute a plan document task by task. Reads each task's Type tag, enforces the Contract fork gate, verifies the task is needed, makes the change, runs type-appropriate verification, and ticks the Definition of Done with evidence.
---

# Worker

Execute a plan document task by task. The plan is the contract: a shared Contract block defines the scope, and each typed task carries a Strategy and a binary Definition of Done. Decide whether each task is valid, enforce the structural gates, make the change, verify against type-appropriate checks, and tick the contract honestly. Do not assume any task is correct — verify everything.

The three guides are the source of truth: Code follows `./guides/code.md`, Tests follow `./guides/tests.md`, Docs follow `./guides/docs.md`. If a task's Strategy contradicts its guide, the plan is wrong — return to the plan skill for a correction. A passing `bun check` / `bun lint` / `bun coverage` does not override a guide violation, because the guides encode decisions the toolchain cannot detect (naming, loop shape, test anti-patterns, doc templates).

The clean division of labor: plan guarantees the Contract is guide-shaped (Phase 2 derived it from the guides); the worker guarantees the implementation is guide-detailed (it reads the matching guide and applies it at the line level — loop shape, import order, JSDoc format, `await tick(0)`, language tags). Both read the guides, once each, at different granularities.

## Non-negotiables

Two rules govern this skill absolutely. They exist because the project's end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if every skill treats the guides as inviolable and every change as carrying its full blast radius.

**Guides are inviolable.** Every file this skill touches follows the matching guide (`code.md` / `tests.md` / `docs.md`). A conflict between the work and a guide is never resolved by silently working around it. Halt, emit a **guide-update proposal** (`guides/{file}.md` §{section} + the rule quoted + the conflict + the proposed edit with reasoning), and pause for the user to resolve case by case. The user accepts (guide changes), rejects (work changes), or defers. Proceeding past an unresolved conflict is silent deviation, and silent deviation is how uniformity dies.

**Every change carries its full blast radius.** Before ticking any task done, verify nothing outside the touched files regressed: run `bun check` for the task's package and for any package whose code imports a changed symbol; coverage is not below baseline; no doc now contradicts the code; no sibling test now asserts dead behavior. A change that satisfies its own DoD but breaks a caller, a test, or a doc elsewhere is not done — the header stays `[ ]`.

## Step 1 — Read the Contract, run the fork gate, verify the task is needed

### Contract fork gate (before any work)

Parse the Contract block at the top of the plan file. If the plan has no Contract block, see "Legacy plans" below.

- **Surface change: yes** → verify Code + Tests + Docs sub-tasks all exist in the file (Config may also be present). If any trio member is missing, the plan is structurally invalid: leave every box `[ ]`, add a comment below the Contract — *"Surface change: yes but missing [Tests|Docs] sub-task — invalid plan per TEMPLATE.md, return to plan skill"* — and stop. Do not execute a partial trio; a surface change with no tests ships untested behavior, and with no docs ships an undocumented surface.
- **Surface change: no** → verify the Contract carries **Tests-view** and **Docs-view** fields with cited reasoning. If either is absent, the plan is structurally invalid: same rejection — leave boxes `[ ]`, cite the missing field, and stop. These fields are required on every code-touching plan precisely so a lone Code task cannot smuggle through an unconsidered test or doc impact.

This gate is the structural enforcement of the rule the plan skill can state but not self-guarantee. A plan that violates the fork goes back to plan, never forward to execution.

### Legacy plans

A plan file with no Contract block predates this skill's current shape. Do not reject it. Infer the type from the task's tag (or by strongest signal — extension is the most reliable classifier: `*.test.ts` → Tests, `.mdx` / `.md` → Docs, `*.config.{ts,mjs,js}` / `tsconfig*` / `package.json` → Config, else Code). Infer scope from the Solution / DoD prose. Note "legacy plan — no Contract block" in the report and proceed through Step 2 onward. Do not rewrite the legacy file into the new shape unless asked — just execute it.

### Verify the task is needed

Before any work, assess the task's truthfulness. Be critical and objective — do not assume an item is correct. Three outcomes:

- **Already correct** — the desired state already exists. Make no change, confirm the checks still pass, and tick every DoD item `[x]` with a comment citing the evidence (file:line, command output).
- **Valid, work needed** — proceed to Step 2.
- **Invalid / belongs in the bin** — the premise is wrong or the Strategy contradicts the guides. Leave every box `[ ]` and add a comment below the task explaining exactly why it was rejected. Do not silently delete or skip.

If the Type tag is missing or clearly wrong, infer the type from the touched files by strongest signal (extension is the most reliable classifier). Note the inference in the plan and proceed.

## Step 2 — Execute and verify per type

Establish a green baseline before changing anything, so any red afterward is attributable to your change rather than inherited. The plan's DoD items are the primary contract you tick; the type-floor below is a safety net for checks a weak or incomplete DoD might have omitted — apply both.

| Type | Baseline before change | Verification floor after change |
|------|------------------------|---------------------------------|
| **Code** | `bun check <pkg>`, `bun lint` | `./guides/code.md` holds on changed files — apply directly, or load the audit skill for the structured review (required when the DoD carries the audit checkbox, recommended for non-trivial changes); new/changed exports have JSDoc (`@internal` where not re-exported by `index.ts`); backward compatible or a changeset exists at `.changeset/*.md` |
| **Tests** | `bun check <pkg>`, `bun coverage` | 100% coverage on the changed source lines (name them); overall coverage not lower than baseline; no anti-pattern from `./guides/tests.md` present; each new test asserts a behavior the source actually exposes |
| **Docs** | `bun test:docs` only if the task touches `docs/src/pages/learn/**`; otherwise the baseline is the cross-check of every code example against the package `index.ts` | examples compile against current signatures; correct template from `./guides/docs.md` used (Function / Prefix / Concept / Pattern / Index / Tutorial); package docs have no frontmatter, website wrappers carry `title` / `description` / `layout`; no claim contradicts the implementation |
| **Config** | `bun check <pkg>`, `bun lint`, `bun bundle <pkg>` if build tooling changed | `tsconfig*` keeps `strict: true` or stronger; no new or changed ESLint rule contradicts `./guides/code.md`; every `scripts` entry referenced by a workflow or another script still exists and still does what its callers expect |

**Per-file audit guide, not per-task-Type:** the Type tag seeds the DoD and picks the primary floor above, but the audit runs against each changed file's *own* guide, chosen by extension — a `*.test.ts` against `./guides/tests.md`, an `.mdx` / `.md` against `./guides/docs.md`, a `.ts` / `.tsx` / `.mjs` under `lib/` / `scripts/` / `plugins/` against `./guides/code.md` — regardless of the task Type. A Code task that ships a `*.test.ts` file has not verified it by auditing only against `./guides/code.md`: the Tests floor applies to those test files (anti-pattern scan, hyphenated filename per `*.test.ts` rule, each test asserts an exposed behavior), and the DoD audit checkbox must cite the guide that matches each file. Tick the audit per file with the guide you actually applied; "0 findings" claimed against the wrong guide is an unticked box.

**Docs-only bypass:** if every touched file is `.md` / `.mdx`, skip `bun check` and `bun coverage` entirely — at baseline and after the change. Those commands verify code and tests, not prose; running them "just to be safe" only adds noise. The Docs floor above is the entire check.

If the baseline is red (and the Docs-only bypass does not apply), stop and report — do not layer changes on a broken start.

Make the change in the task's Strategy, then verify against the plan's DoD items plus the type-floor. Every Definition of Done item is binary — there are no partial ticks.

## Step 3 — Contract-consistency gate, then tick honestly

### Contract-consistency gate (before ticking)

Before ticking a sub-task done, verify the implementation is consistent with the Contract that scoped it:

- **Code task (Surface change: yes)** — the implemented signatures match Contract.Public API delta verbatim. Every file in Contract.Files was touched as specified.
- **Tests task** — every scenario in Contract.Behavioral scenarios has a corresponding `test()`. No more, no less — an extra test asserts something the Contract did not scope; a missing test leaves a scenario uncovered.
- **Docs task** — every entry in Contract.Doc placement produced the specified section with the specified content. The Public API delta signatures appear verbatim in the doc.

A mismatch is an unticked box, not a tick. Fix the implementation to match the Contract, or — if the Contract itself is wrong — return to plan for a correction. Do not tick a box that papers over a mismatch.

### Tick honestly

For each DoD item you verified, tick `[x]` and append a short note citing the evidence — the command and its exit status, or the `file:line` you cross-checked. Example: `[x] \`bun check core\` exits 0 — verified`. No note, no tick.

A task's header `## [ ] Task Name` becomes `## [x] Task Name` only when every one of its Definition of Done items is `[x]` and the Contract-consistency gate passed. If even one item is unmet or unverifiable, the header stays `[ ]` and the task is not done. There is no third marker.

## Step 4 — Report and self-check

Report a brief per-task status to the user — done, already-correct, rejected (with the reason), or structurally-invalid (fork gate failure, returned to plan) — alongside the mutated plan file (ticks + evidence live in the plan). Then ask:

- Did I run the Contract fork gate before any work (or correctly identify a legacy plan and bypass it)?
- Did I establish a green baseline before changing anything (or correctly skip it via the Docs-only bypass)?
- Did the Contract-consistency gate pass — does the implementation match the Contract that scoped it?
- Is every tick backed by evidence I cited inline?
- Did the type-appropriate verification actually pass, or did I assume it?
- Does the change follow the matching guide at the line level?
- Did I check the blast radius — `bun check` green in every affected package (not just the task's), coverage not below baseline, no doc or sibling test broken outside the touched files?

If any answer is no, the task is not done.
