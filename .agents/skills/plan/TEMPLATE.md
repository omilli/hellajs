# Plan Template

The artifact contract. Plan writes it; worker reads and mutates it; both parse it structurally. Copy the structure verbatim — do not add, remove, rename, or reorder sections. When `SKILL.md` and this file disagree on shape, this file wins.

## Hard rules

- Every task is exactly one type: **Code**, **Tests**, **Docs**, or **Config**. Work that spans types is split into typed sub-tasks.
- Plan paths derive from package and root-task type: `./plans/{package}/{type}/[name].md`, where `{package}` = `Contract.Package` and `{type}` = lowercase root-task Type tag (the task with `Depends on: None`; `code` | `tests` | `docs` | `misc` for Config/other). Non-package work → `./plans/meta/{type}/[name].md`. Never root-level. The type words match the worker's Type-tag vocabulary, so the folder signals what the worker is parsing; a trio plan roots in Code → `code/`, and its embedded Tests/Docs tasks are still dispatched by the worker via their in-file Type tags.
- `[ ]` and `[x]` are the only completion markers. The worker skill depends on them.
- The H1 title carries the plan's aggregate status: `[ ]` until every `## ` task header is `[x]`, then `[x]`. The worker maintains it; legacy plans (no H1) are exempt.
- No numbered lists in the body. No digits in filenames — `task-name.md`, never `01-task-name.md`.
- Every Definition of Done item is a command that exits 0 or a yes/no question. Prose items do not belong — if it cannot be verified, do not keep it.
- Every code-touching plan carries **Tests-view** and **Docs-view** fields in the Contract, whether or not tests or docs result. "No impact, because…" cited to the matching guide is a valid value. Omitting the field produces an invalid plan the worker rejects.

## Surface change — the fork

The Contract opens with one line that forks the entire plan:

**Surface change:** `yes` | `no`

`yes` if the change adds, changes, or removes any symbol re-exported by the package's `index.ts`, or any field on a public type consumers pass, or any public signature. The definition lives in `code.md` §Package File Structure and §index.ts Rules — read `index.ts` to decide; do not guess from the feature description. The fork is factual.

- **`yes`** → the change has three views (implementation, verification, publication). The plan MUST contain Code + Tests + Docs sub-tasks sharing one Contract. They land together: tests import the code's signatures and docs document them, so partial merges ship a surface that is untested or undocumented.
- **`no`** → one task of the matching type. Tests-view and Docs-view fields still appear and justify the absence of sibling tasks.

## The Contract block (required, opens every plan file)

The shared scope every task references. Tasks do not re-derive scope from prose — they point at the Contract. The guides are the derivation function for each artifact below; the governance header cites the section applied so the derivation is checkable.

```md
## Contract

### Surface change
[yes | no]

### Package
[package]

### Guide governance
- Files ← code.md §[section]
- [if yes] Public API delta ← code.md §[section]
- [if scenarios] Behavioral scenarios ← tests.md §[section]
- [if docs] Doc placement ← docs.md §[section]

### Files
- [path] — [create|modify|delete] — [content anchor: function/heading name + relative position; line numbers as hints only]

### Public API delta            ← only if Surface change: yes
[Verbatim new/changed signatures, followed by one runnable usage example — import, call, return — per docs.md §Code Examples. The signature is the contract Code implements and Tests imports; the example validates the API design and seeds the Docs task.]

### Behavioral scenarios        ← only if tests are in scope
- [one line per scenario; each maps to one test(); format: condition → observable result; present tense]

### Doc placement               ← only if docs are in scope
- [file] — [template from docs.md §Template Selection] — [section] — [one-line content brief]

### Tests view
[Required on every code-touching plan.] What tests are needed and why, cited to tests.md. For Surface change: yes, point at Behavioral scenarios. For Surface change: no, justify the absence with a cited reason.

### Docs view
[Required on every code-touching plan.] What docs are needed and why, cited to docs.md. For Surface change: yes, point at Doc placement. For Surface change: no, justify the absence with a cited reason.
```

---

## Single-task plan (Surface change: no)

Path: `./plans/{package}/{type}/[name].md` per the Hard rules path bullet (lowercase, hyphenated, no digits).

```md
# [ ] [task-name]

## Contract

### Surface change
no

### Package
[package]

### Guide governance
- Files ← code.md §[section]
- [if Docs task: Doc placement ← docs.md §[section]]

### Files
- [path] — [verb] — [anchor]

### Tests view
[reasoning cited to tests.md]

### Docs view
[reasoning cited to docs.md]

---

## [ ] Task Name
**Type:** [Code | Tests | Docs | Config]
**Depends on:** None

### Strategy
[2–4 sentences: approach, key decisions, trade-offs considered and rejected. Constrained by the guides — code.md decision precedence, tests.md anti-patterns, docs.md templates. Not the code itself; this is advisory context where design judgment lives so the worker does not re-exercise it.]

### Definition of Done
- [ ] [seeded from the matching block below; drop inapplicable items; add Contract-derived items]
```

Surface change: `no` plans may have multiple tasks when the work spans distinct concerns (e.g., a migration with cleanup, rename, and restructure phases). The Contract is shared scope as usual; tasks are ordered by dependency. No trio is required because there is no public surface to verify or document.

---

## Multi-task plan (Surface change: yes)

Path: `./plans/{package}/{type}/[name].md` per the Hard rules path bullet — one file. The trio shares one Contract; the typed sub-tasks follow it. One file because the Contract is the glue and the trio must land together. A trio plan's root task is Code, so it lands in `{package}/code/`; its Tests and Docs sub-tasks live inside the file and are still dispatched by the worker via their in-file Type tags.

```md
# [ ] [plan-name]

## Contract

### Surface change
yes

### Package
[package]

### Guide governance
- Files ← code.md §[section]
- Public API delta ← code.md §[section]
- Behavioral scenarios ← tests.md §[section]
- Doc placement ← docs.md §[section]

### Files
- [path] — [verb] — [anchor]
- ...

### Public API delta
[verbatim signatures + runnable usage example]

### Behavioral scenarios
- [scenario 1]
- [scenario 2]
- ...

### Doc placement
- [file] — [template] — [section] — [brief]
- ...

### Tests view
New [test file], [N] scenarios per Behavioral scenarios above, per tests.md §[section].

### Docs view
Modify [doc file], per Doc placement above, per docs.md §[section].

---

## [ ] Implement [feature] (Code)
**Depends on:** None

### Strategy
[approach + decisions + trade-offs]

### Definition of Done
- [ ] [Code seed block, adapted]

## [ ] Test [feature] (Tests)
**Depends on:** Implement [feature]

### Strategy
[test structure + scenario → test() mapping]

### Definition of Done
- [ ] [Tests seed block, adapted]

## [ ] Document [feature] (Docs)
**Depends on:** Implement [feature]

### Strategy
[doc shape + example to write, seeded by Contract.Public API delta]

### Definition of Done
- [ ] [Docs seed block, adapted]
```

Additional Config sub-tasks follow when build tooling changes. The trio (Code + Tests + Docs) is the minimum for Surface change: yes; Config is added alongside, never substituted for a trio member.

---

## Definition of Done seed blocks

Pick the block matching the task type. Drop inapplicable items. Add Contract-derived items — every Files entry, every scenario, every doc-placement entry, every delta line generates a verifiable item. Never keep an item you cannot verify.

### Code

For files under `packages/*/lib/`, `packages/*/src/`, `plugins/**`, `scripts/**`.

- [ ] `bun coverage <package>` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] [Surface change only] Public API delta in Contract implemented verbatim — every signature matches
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`)
- [ ] No new runtime dependency, OR justified in Strategy
- [ ] Backward compatible unless the change is a breaking change, OR justified in Strategy
- [ ] Contract Tests-view and Docs-view hold — sibling tasks exist OR the "no impact" reasoning is accurate against the actual change
- [ ] Audit skill run on changed files reports no deviations from `./guides/code.md`

### Tests

For files under `packages/*/tests/**`, or any `*.test.ts` / `*.spec.ts`.

- [ ] `bun coverage <package>` shows 100% coverage on the changed source lines (named in Contract.Files)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against the implementation

### Docs

For files under `packages/*/docs/**`, `docs/**`, or any `.mdx` / `.md`.

- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index / Tutorial)
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] [Surface change only] Public API delta signatures appear verbatim in the doc; usage example from Contract appears under `## Basic Usage`
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests

### Config

For `tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `plugins/**/{babel,rollup,vite}/**`, `.github/workflows/**`, or any `*.config.{ts,mjs,js}`.

- [ ] `bun coverage <package>` exits 0 for every package the change touches
- [ ] `bun bundle <package>` succeeds for every package whose build tooling changed
- [ ] No new runtime dependency unless justified in Strategy
- [ ] No new or changed ESLint rule contradicts `./guides/code.md`
- [ ] `tsconfig*` keeps `strict: true` or stronger; nothing was weakened
- [ ] Every `scripts` entry in `package.json` referenced by a workflow or another script still exists and still does what its callers expect
