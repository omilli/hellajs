---
name: audit
description: Audit source code, tests, config, or documentation against the project style guides. Use when asked to review, critique, grade, or audit any .ts/.tsx, .test.ts, .mdx/.md, tsconfig/eslint/package.json, or build plugin file — auto-detects the content type and applies the matching guide from ./guides/.
---

# Audit

One audit skill, four content types. Detect what you were given, read the matching guide, ground every finding in a runnable check where possible, then assess the guide itself. Read exactly one guide per file — loading all four wastes context and blurs the comparison.

The end goal is for this skill to produce no findings. Don't make suggestions for the sake of seeming thorough — if the input already follows the guide, say so explicitly. A clean audit is a good audit.

## Non-negotiables

Two rules govern this skill absolutely. They exist because the project's end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if every skill treats the guides as inviolable and every change as carrying its full blast radius.

**Guides are inviolable.** Every finding cites the guide rule it enforces. A finding is never "this file should do X because it'd be better" — it is "this file breaks guide rule Y." When the guide itself is wrong, stale, or missing for the case at hand, emit a **guide-update proposal** (`guides/{file}.md` §{section} + the rule quoted + the conflict + the proposed edit with reasoning) in the report's Guide assessment block — never as an inline workaround that lets the file diverge. The user decides case by case. Proceeding past a guide conflict without a proposal is silent deviation, and silent deviation is how uniformity dies.

**Every change carries its full blast radius.** Each finding states the blast radius of its fix — every file the fix touches beyond the cited one (a renamed export ripples to every importer; a changed error message ripples to every test asserting it; a moved type ripples to every file that imports it). A finding that names only the cited file hides the real cost of the fix and ships half the change.

## Step 1 — Discover the input set, then classify

### Discovery — when the input is a scope, not a file list

The user often names a target without naming paths (`audit core docs`, `audit dom docs`, `audit the docs`). In that case, discover files by globbing the **entire scope** — never anchor on the `docs/` folder, which silently skips root metadata like `AGENTS.md`, `README.md`, and `*-comparison.md`. That miss is the exact failure this step exists to prevent.

| User input | Glob pattern |
|---|---|
| `audit <package> docs` (e.g. `core`, `dom`) | `packages/<package>/**/*.{md,mdx}` |
| `audit <plugin> docs` (e.g. `babel`) | `plugins/<plugin>/**/*.{md,mdx}` |
| `audit docs` (no target named) | `**/*.{md,mdx}` repo-wide |

Run the glob, drop blacklisted files (see below), then list every remaining file at the top of the report so the user can confirm coverage before findings begin. If a glob returns nothing, say so and stop — do not silently narrow the scope to `docs/`. When the user names explicit paths instead of a scope, audit exactly those files and skip discovery.

### Classify each file

Classify each discovered (or explicitly given) file using the strongest signal first. State the detected type explicitly at the top of the report before continuing — a silent classification cannot be corrected if it is wrong.

| Type | Strongest signal | Path signals | Content signals |
|------|------------------|--------------|-----------------|
| **Tests** | `*.test.ts` / `*.spec.ts` extension, or any path under `*/tests/` | `packages/*/tests/**` | `from "bun:test"`, `describe(`, `test(`, `expect(`, `mock(` |
| **Docs** | Any `*.md` / `*.mdx` file, anywhere in the repo | repo-root `*.md`, `packages/*/docs/**`, `packages/*/{AGENTS,README,*-comparison}.md`, `plugins/*/{AGENTS,README}.md`, `docs/src/pages/**`, `examples/**`, `guides/*.md` | frontmatter (`---\ntitle:`), prose with fenced code blocks |
| **Config** | Any `tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `*.config.{ts,mjs,js}`, or a path under `plugins/**/{babel,rollup,vite}/**` or `.github/workflows/**` | root config files, `plugins/**`, `.github/**` | `"compilerOptions"`, `rules:` with eslint plugin refs, `"scripts":`, build-plugin `export default` hook shape |
| **Code** | `.ts` / `.tsx` / `.js` / `.mjs` under `lib/`, `src/`, `plugins/`, or `scripts/` | `packages/*/lib/**`, `plugins/**`, `scripts/**` | `export function`, JSDoc, `@hellajs/` imports |

**Blacklist — skip entirely, never audit:** `CLAUDE.md`, `CHANGELOG.md`, and the generated `.github/` mirrors (`.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`), wherever they appear. All three are machine-generated — `CLAUDE.md` and the `.github/` mirrors are regenerated from `AGENTS.md` by `bun sync`, so audit `AGENTS.md` instead; `CHANGELOG.md` is release history built from changesets. Reviewing any of them wastes effort and yields findings no one acts on.

Precedence for ambiguous files:

- A root metadata `.md` file (`AGENTS.md`, `README.md`) at the repo root, a package root, or a plugin root is **Docs**, audited **correctness-first** against the full `lib/` source — see "Root metadata docs" in Step 3. `docs.md`'s API-doc template rules (frontmatter, `## API`, `## Basic Usage`, language tags) do not apply; these files are architecture and landing docs, not API references.
- `*-comparison.md` files at package roots are **Docs** — generated by the `/comparison` skill, audited as regular Docs (template + source citations).
- `guides/*.md` are Docs by extension but act as the audit rubric itself; assess them under Step 4 (guide self-assessment), not as Docs findings against `docs.md`.
- A `.test.ts` / `.spec.ts` file is always **Tests** — even outside `tests/`. The extension is load-bearing: `bun test` / `bun coverage` will not see the file without it.
- An `.mdx` / `.md` file is always **Docs** — even with heavy code. Prose wrapping code blocks is documentation, not source.
- A `tsconfig*.json`, `eslint.config.*`, `package.json`, or `*.config.{ts,mjs,js}` file is always **Config** — even next to source. Config answers to different rules than the code beside it.
- Files under `examples/` are **Docs** (tutorial-shaped progressive-build apps that document usage), not Code. Apply the Tutorial Doc rules in `./guides/docs.md`.
- A batch that mixes types is audited file-by-file against its own guide. Do not collapse the batch into one pass — one file's rule (no `any`) is another's allowance (`unknown` shapes in config), and merging them hides which file broke which rule.

## Step 2 — Read the matching guide

Read exactly one (PER FILE TYPE):

- **Tests** → `./guides/tests.md`
- **Docs** → `./guides/docs.md`
- **Config** → `./guides/code.md` (no dedicated `./guides/config.md` exists yet; config files follow `code.md`'s conventions — double quotes, semicolons, no external deps, strict typing — plus the Config-specific checks in Step 3)
- **Code** → `./guides/code.md`

The three guides are the source of truth, never the input's own local conventions. A file that is internally consistent but breaks its guide is still non-compliant.

## Step 3 — Ground every finding before reporting

Eyeballing code misses regressions the toolchain already catches. Run the type-appropriate check first so each finding is either confirmed by command output or, when the toolchain cannot see it, reasoned explicitly against the guide. Cite the command and its exit status (or the `file:line`) on every finding — an unsourced finding is an opinion.

| Type | Baseline commands | What they ground |
|------|-------------------|------------------|
| **Tests** | `bun check <package>`, `bun coverage` | Tests compile; coverage gaps named by line |
| **Docs** | `bun test:docs` only if the file lives under `docs/src/pages/learn/**`; otherwise cross-check every code example against the current source signatures by reading the package `index.ts` | Examples resolve; no `expect`/`toBe`/`describe` in doc blocks; signatures match exports |
| **Config** | `bun check <package>`, `bun lint`, `bun bundle <package>` if build tooling changed | Config parses; lint passes; bundle still builds |
| **Code** | `bun check <package>`, `bun lint` | Compiles; lint passes |

Docs-only input (entirely `.md` / `.mdx`) skips `bun check` and `bun coverage` — those verify code and tests, not prose. The cross-check against `index.ts` is the entire grounding for Docs.

Qualitative checks the commands cannot catch:

- **Tests** — each test asserts a behavior the source actually exposes (no tests of symbols not exported from `index.ts`); scan for the anti-patterns `./guides/tests.md` enumerates (`jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, bare `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files).
- **Docs** — correct template from `./guides/docs.md` (Function / Prefix / Concept / Pattern / Index / Tutorial); package docs have no frontmatter, website wrappers carry `title` / `description` / `layout`; code blocks use the right language tag and show imports; no claim contradicts the implementation; no silent no-op (a `get`/`read` demo against a key that was never written).
- **Root metadata docs** (`AGENTS.md`, `README.md` at repo / package / plugin root) — correctness is the entire job. Read the relevant `lib/` source in full (the package's, or the whole repo's for the root `AGENTS.md` / `README.md`) and verify every architectural claim, API signature, behavior description, and file reference against the actual implementation — a cited `lib/foo.ts` must exist and say what the doc claims; flag drifted signatures, moved or renamed file references, and any claim the source contradicts. This cross-check always runs — it is the whole point of auditing these files — and it is feasible because the `lib/` source they describe is read in full as part of the audit. `docs.md`'s API-doc template rules do not apply; read `./guides/code.md` as the cross-reference for signature, naming, and type expectations.
- **Config** — every `scripts` entry referenced by a workflow or another script exists and still resolves; `tsconfig*` keeps `strict: true` or stronger and its path mapping matches the package layout; no ESLint rule contradicts `./guides/code.md` (banning double quotes, allowing missing semicolons); build-plugin exported hook shape matches its stated purpose and runtime; flag any unjustified new runtime dependency and any orphaned or renamed script.
- **Code** — the style guide is the full checklist: JSDoc on every type and function (`@internal` where exported but not re-exported by `index.ts`); `import type` separated; double quotes and semicolons; cached `while` loops with no `for...of` / `for...in` in hot paths; naming (single-word public, verb-first internal, `$`-prefix refs, PascalCase components); **package file structure** — read `index.ts` to learn which symbols are public, then verify every top-level `lib/*.ts` file: it exports exactly one public API function, its filename verbatim matches that export, and it is in fact re-exported by `index.ts`. Any file whose exports are all `@internal` or absent from `index.ts` is internal code and must live under `lib/internal/`; flag a top-level file that exports multiple public functions, a filename that diverges from its single export, or an internal-only file sitting at the top level; **type visibility** — run `bun .agents/skills/audit/scripts/check-type-visibility.mjs`: any `@internal`-tagged type sitting in a file reached by `index.ts`'s `export type *` is a leak, because visibility is by file location — public types live grouped in `lib/types/*.d.ts`, internal types are co-located with the code that owns them in `lib/internal/` (never a catch-all `lib/internal/types.ts`; when more than one internal module reads a type, the owning module exports it `@internal` and the siblings import from there) — and `@internal` on a hand-written `.d.ts` is decorative (TS does not strip it); file/function soft limits; error-handling shape; no `any`, no single-use helper under 30 lines.

## Step 4 — Assess the style guide itself

Guides drift. While applying the guide, note any rule that is wrong, stale, contradicted by the real codebase, or missing for a case this audit had to resolve. This is the **guide-update proposal** from the Non-negotiables — emit it in the report's Guide assessment block with the full shape (`guides/{file}.md` §{section} + the rule quoted + the conflict + the proposed edit with reasoning), never as an inline workaround that lets the file diverge. This is where the audit pays forward — a corrected guide improves every future audit and every plan the worker skill executes.

Guide edits reason from general principle, never from the specific package code under review. Citing "the `ForEach` reconcile path does X" hardcodes a package detail into a project-wide guide and rots on the next refactor; citing "internal hot-path state justifies short field names for hidden-class density" keeps the rule portable. The guide governs all six packages — keep it general.

## Step 5 — Report inline

Render the report in the conversation. Do not write a file unless the user asks. Use this exact structure so the findings list is scannable and each item is self-contained enough to hand off to the `/plan` skill:

```
## 1. Audit — [Type] — [file(s)]

Detected type: **[Type]** — [one-line reason]

### Summary
[N findings: M Violations, P Accuracy errors, Q Suggestions]
One-sentence overall assessment.

### Findings

#### [n]. [Violation | Accuracy | Suggestion] — file:line — short title
**Rule**: [guide section, e.g. `tests.md › Anti-Patterns`]
**Evidence**: `quoted excerpt from the input`

(repeat per finding; order Violations, then Accuracy, then Suggestions)

### Guide assessment
[Whether the guide held up; any proposed edits with reasoning. "No edits proposed" if it held up.]
```

Finding categories:

- **Violation** — breaks an explicit rule in the matching guide.
- **Accuracy** — a Doc claim, signature, or example contradicts the source; a Test asserts a behavior the source does not expose; a Config value contradicts actual usage.

Be critical but constructive: justify every finding with quoted evidence and propose one concrete fix. If the input already follows the guide, say so explicitly — an audit that manufactures findings to seem thorough is worse than one that says "clean."

## Step 6 — Offer the plan handoff

At the end of the report, list the findings by number and ask the user which (if any) to hand off to the `/plan` skill. Do not auto-load `/plan` and do not write a plan file unprompted — an audit reports; the user decides what becomes tracked work. A clean audit with no actionable findings states that and stops, with no handoff offered.

Audit is **reactive discovery** (fix-this), where feature is generative discovery (add-this). Both feed plan the same shape — an evidence map — so plan's Phase 0 intake is identical regardless of source. For each finding the user chooses to hand off, produce:

- **Gap** — the one-sentence finding (what is wrong), rephrased as the target state plan will reach.
- **Scope hint** — the file's detected type from Step 1: `surface` (a Code finding in a file under `lib/*.ts` whose symbol is re-exported by `index.ts`), `internal` (Code under `lib/internal/`), `docs`, `config`, or `tests`. Plan re-verifies surface by reading `index.ts`.
- **Citations** — `{ file, anchor, what-it-shows }` per finding. The anchor is the function/type/heading name (stable across edits); the line number from the finding is a hint. "What-it-shows" is the violated guide rule with its section, because that rule is the target state plan's Contract must restore.

Plan reads each citation, reads the cited guide rule, and derives the Contract for the fix — the rule itself defines the delta (for Code), the scenarios (for Tests), or the corrected content (for Docs). An audit finding carries its own success criterion in the rule it violated, so the evidence map is unusually tight: the gap and the target are the same statement.
