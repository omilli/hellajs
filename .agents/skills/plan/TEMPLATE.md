# Plan Template

Copy this structure verbatim into the plan file. Do not add, remove, rename, or reorder sections. Pick the single task type, seed its Definition of Done, delete the other three seeds.

A task is always exactly one type: **Code**, **Tests**, **Docs**, or **Config**. If a piece of work spans multiple types, split it into separate task files (preferred) or typed sub-tasks inside one file (see "Multi-task plans").

Hard rules for the artifact:

- No numbered lists anywhere in the file body. No digits in file names — `task-name.md`, never `01-task-name.md`.
- `[ ]` and `[x]` are the only completion markers. The worker skill depends on them.
- Every Definition of Done item is either a command that must exit 0 or a yes/no question. No prose, no "should be fine". If it cannot be verified, do not keep it.

---

## Single-task file

Path: `./plans/[task-name].md` (lowercase, hyphenated, no digits).

```md
## [ ] Task Name
**Type:** Code   (one of: Code, Tests, Docs, Config)

### Depends On
- <task name>, or "None"

### Objective
One sentence: what is true in the repo when this task is done.

### Solution
Concrete approach. Name the files touched and the strategy. Note key decisions and trade-offs. Not a code dump. If the task touches any public API (a symbol re-exported by the package's `index.ts`), include a runnable usage example showing the new or changed API in use — import, call site, and what comes back.

### Definition of Done
- [ ] <seeded from the matching block below, drop what does not apply, then add task-specific items>
- [ ] ...
```

---

## Multi-task plans

Path: `./plans/[plan-name]/[task-name].md` — one file per task, each following the single-task structure above. The folder name is the plan name (lowercase, hyphenated, no digits).

Use separate task files when the tasks are independent (different packages, different concerns, can be merged separately).

Use typed sub-tasks inside one task file only when the work is tightly coupled and must land together (e.g., a feature plus its tests plus its docs). Structure:

```md
## [ ] Task Name

### Depends On
- <task name>, or "None"

### Objective
One sentence for the whole task.

### Sub-tasks

#### [ ] <Sub-task name> (Code)
**Solution:** <approach>

**Definition of Done:**
- [ ] <seeded Code block + task-specific items>

#### [ ] <Sub-task name> (Tests)
**Solution:** <approach>

**Definition of Done:**
- [ ] <seeded Tests block + task-specific items>
```

Every sub-task still has exactly one type and its own binary Definition of Done.

---

## Definition of Done seed blocks

Pick exactly one block per task (or sub-task). Drop items that do not apply. Add task-specific items. Never keep an item you cannot verify.

### Code

For files under `packages/*/lib/`, `packages/*/src/`, `plugins/**`, `scripts/**`.

- [ ] `bun check <package>` exits 0
- [ ] `bun lint` exits 0
- [ ] Solution includes a runnable code example for each new or changed public API symbol (re-exported by the package's `index.ts`), OR the Solution explicitly states the task touches no public API
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

### Tests

For files under `packages/*/tests/**`, or any `*.test.ts` / `*.spec.ts`.

- [ ] `bun check <package>` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (name the file and line range in the Solution)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

### Docs

For files under `packages/*/docs/**`, `docs/**`, or any `.mdx` / `.md`.

- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)

### Config

For `tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `plugins/**/{babel,rollup,vite}/**`, `.github/workflows/**`, or any `*.config.{ts,mjs,js}`.

- [ ] `bun check` exits 0 for every package the change touches
- [ ] `bun lint` exits 0
- [ ] `bun bundle <package>` succeeds for every package whose build tooling changed
- [ ] No new runtime dependency unless justified in Solution
- [ ] No new or changed ESLint rule contradicts `./guides/code.md`
- [ ] `tsconfig*` changes keep `strict: true` or stronger; nothing was weakened
- [ ] Every `scripts` entry in `package.json` referenced by a workflow or another script still exists and still does what its callers expect
