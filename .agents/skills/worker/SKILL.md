---
name: worker
description: Execute a plan file task by task. Use when given a plan under ./plans/ to implement. Reads each task's Type tag (Code/Tests/Docs/Config), critically verifies the task is needed, makes the change, runs type-appropriate verification, and ticks the plan's Definition of Done with evidence.
---

# Worker

Execute a plan file task by task. The plan is the contract: each task carries a Type tag, a Solution, and a binary Definition of Done. Decide whether each task is valid, make the change if it is, verify against the type-appropriate checks, and tick the contract honestly. Do not assume any task is correct — verify everything.

## Step 1 — Read the Type tag and verify the task is needed

Each task carries a Type tag: Code / Tests / Docs / Config. Trust the tag and run the matching verification in Step 2 — do not reclassify. If the tag is missing or wrong (e.g., tagged Tests but touches no test files), flag it, infer the type from the touched files using the audit skill's signals, note the inference in the plan, and proceed.

Before any work, assess the task's truthfulness. Be critical and objective — do not assume an item is correct. Three outcomes:

- **Already correct** — the desired state already exists. Make no change. Tick every DoD item `[x]` with a comment citing the evidence (file:line, command output).
- **Valid, work needed** — proceed to Step 2.
- **Invalid / belongs in the bin** — the premise is wrong or the Solution contradicts the style guides. Leave every box `[ ]` and add a comment below the task explaining exactly why it was rejected. Do not silently delete or skip.

## Step 2 — Execute and verify per type

Before making any change, run the type-appropriate check for the task's package(s) to confirm a green baseline. Any red after your change is then yours.

- **Code** / **Config** → `bun check <package>` (add `bun lint` if the DoD requires it)
- **Tests** → `bun coverage`
- **Docs** → `bun test:docs` only if the task touches `docs/src/pages/learn/**`; otherwise the baseline is the cross-check below

If the baseline is red, stop and report — do not layer changes on a broken start.

Make the change in the task's Solution, then verify. Every Definition of Done item is binary — there are no partial ticks.

- **Code** — `bun check <package>` exits 0; `bun lint` exits 0; run the audit skill on the changed files and confirm no deviations from `./guides/code.md`; new or changed exports have JSDoc (`@internal` where not re-exported by `index.ts`); backward compatible or a changeset exists at `.changeset/*.md`.
- **Tests** — `bun check <package>` exits 0; `bun coverage` shows 100% on the changed source lines (name them) and overall coverage is not lower than the baseline; no anti-pattern from `./guides/tests.md` (`jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files); each new test asserts a behavior the source actually exposes.
- **Docs** — every code example compiles against the current source signatures; the correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index); package docs (`packages/*/docs/**/*.mdx`) have no frontmatter, website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, `layout`; no claim contradicts the implementation.
- **Config** — `bun check` exits 0 for every touched package; `bun lint` exits 0; `bun bundle <package>` succeeds if build tooling changed; no new or changed ESLint rule contradicts `./guides/code.md`; `tsconfig*` keeps `strict: true` or stronger; every `scripts` entry referenced by a workflow or another script still exists and still does what its callers expect.

## Step 3 — Tick the contract honestly

For each Definition of Done item you verified, tick `[x]` and append a short note citing the evidence — the command and its exit status, or the file:line you cross-checked. Example: `[x] \`bun check core\` exits 0 — verified`. No note, no tick.

A task's header `## [ ] Task Name` becomes `## [x] Task Name` only when every one of its Definition of Done items is `[x]`. If even one item is unmet or unverifiable, the header stays `[ ]` and the task is not done. Do not invent a third marker.

## Step 4 — Self-check after each task

Ask: Did I establish a green baseline before changing anything? Is every tick backed by evidence I cited inline? Did the type-appropriate verification actually pass, or did I assume it? Does the change follow `./guides/code.md`, `./guides/tests.md`, and `./guides/docs.md`? If any answer is no, the task is not done.
