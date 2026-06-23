---
name: worker
description: Execute a plan file task by task. Use when given a plan under ./plans/ to implement. Reads each task's Type tag (Code/Tests/Docs/Config), critically verifies the task is needed, makes the change, runs type-appropriate verification, and ticks the plan's Definition of Done with evidence.
---

# Worker

Execute a plan file task by task. The plan is the contract: each task carries a Type tag, a Solution, and a binary Definition of Done. Decide whether each task is valid, make the change if it is, verify against type-appropriate checks, and tick the contract honestly. Do not assume any task is correct — verify everything.

The three guides are the source of truth: Code follows `./guides/code.md`, Tests follow `./guides/tests.md`, Docs follow `./guides/docs.md`. If a plan's Solution contradicts its guide, the plan is wrong — return to the plan skill and force a correction inline with the style guides. A passing `bun check` / `bun lint` / `bun coverage` does not override a guide violation, because the guides encode decisions the toolchain cannot detect (naming, loop shape, test anti-patterns, doc templates).

## Step 1 — Read the Type tag and verify the task is needed

Each task carries a Type tag: Code / Tests / Docs / Config. Trust the tag and run the matching verification in Step 2 — do not reclassify. If the tag is missing or clearly wrong (e.g., tagged Tests but touches no test files), infer the type from the touched files by strongest signal — extension is the most reliable classifier (`*.test.ts` → Tests, `.mdx` / `.md` → Docs, `*.config.{ts,mjs,js}` / `tsconfig*` / `package.json` → Config, else Code). Note the inference in the plan and proceed.

Before any work, assess the task's truthfulness. Be critical and objective — do not assume an item is correct. Three outcomes:

- **Already correct** — the desired state already exists. Make no change, confirm the checks still pass, and tick every DoD item `[x]` with a comment citing the evidence (file:line, command output).
- **Valid, work needed** — proceed to Step 2.
- **Invalid / belongs in the bin** — the premise is wrong or the Solution contradicts the guides. Leave every box `[ ]` and add a comment below the task explaining exactly why it was rejected. Do not silently delete or skip.

## Step 2 — Execute and verify per type

Establish a green baseline before changing anything, so any red afterward is attributable to your change rather than inherited. The plan's DoD items are the primary contract you tick; the type-floor below is a safety net for checks a weak or incomplete DoD might have omitted — apply both.

| Type | Baseline before change | Verification floor after change |
|------|------------------------|---------------------------------|
| **Code** | `bun check <pkg>`, `bun lint` | `./guides/code.md` holds on changed files — apply directly, or load the audit skill for the structured review (required when the DoD carries the audit checkbox, recommended for non-trivial changes); new/changed exports have JSDoc (`@internal` where not re-exported by `index.ts`); backward compatible or a changeset exists at `.changeset/*.md` |
| **Tests** | `bun check <pkg>`, `bun coverage` | 100% coverage on the changed source lines (name them); overall coverage not lower than baseline; no anti-pattern from `./guides/tests.md` present; each new test asserts a behavior the source actually exposes |
| **Docs** | `bun test:docs` only if the task touches `docs/src/pages/learn/**`; otherwise the baseline is the cross-check of every code example against the package `index.ts` | examples compile against current signatures; correct template from `./guides/docs.md` used (Function / Prefix / Concept / Pattern / Index); package docs have no frontmatter, website wrappers carry `title` / `description` / `layout`; no claim contradicts the implementation |
| **Config** | `bun check <pkg>`, `bun lint`, `bun bundle <pkg>` if build tooling changed | `tsconfig*` keeps `strict: true` or stronger; no new or changed ESLint rule contradicts `./guides/code.md`; every `scripts` entry referenced by a workflow or another script still exists and still does what its callers expect |

**Docs-only bypass:** if every touched file is `.md` / `.mdx`, skip `bun check` and `bun coverage` entirely — at baseline and after the change. Those commands verify code and tests, not prose; running them "just to be safe" only adds noise. The Docs floor above is the entire check.

If the baseline is red (and the Docs-only bypass does not apply), stop and report — do not layer changes on a broken start.

Make the change in the task's Solution, then verify against the plan's DoD items plus the type-floor. Every Definition of Done item is binary — there are no partial ticks.

## Step 3 — Tick the contract honestly

For each DoD item you verified, tick `[x]` and append a short note citing the evidence — the command and its exit status, or the `file:line` you cross-checked. Example: `[x] \`bun check core\` exits 0 — verified`. No note, no tick.

A task's header `## [ ] Task Name` becomes `## [x] Task Name` only when every one of its Definition of Done items is `[x]`. If even one item is unmet or unverifiable, the header stays `[ ]` and the task is not done. There is no third marker.

## Step 4 — Report and self-check

Report a brief per-task status to the user — done, already-correct, or rejected with the reason — alongside the mutated plan file (ticks + evidence live in the plan). Then ask: Did I establish a green baseline before changing anything (or correctly skip it via the Docs-only bypass)? Is every tick backed by evidence I cited inline? Did the type-appropriate verification actually pass, or did I assume it? Does the change follow the matching guide? If any answer is no, the task is not done.
