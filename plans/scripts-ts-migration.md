# scripts-ts-migration

Migrate all build scripts from `.mjs`/`.js` with tabs and `node`/`npx` invocations to typed `.ts` with 2-space indent, `bunx`, proper JSDoc, derived dependency graph, and `bundle.mjs` split into concern modules. Driven by the 12 violations + 2 suggestions from the scripts audit.

## Contract

### Surface change
no

### Package
scripts (root build tooling -- not a package workspace; no `index.ts` barrel, no public API consumed by packages)

### Guide governance
- Files <- `scripts.md` > Canonical paths, > File-structure decision tree, > Language and runtime, > Shared utils, > Style
- Doc placement <- `docs.md` > Template Selection (guide-update proposal only, task apply-guide-update)
- Tests view <- `scripts.md` > Verification Checklist ("bun lint exits 0 -- scripts are in the lint tsconfig")

### Files

Task apply-guide-update:
- `guides/scripts.md` -- modify -- Verification Checklist, Utils usage section (~line 113)

Task delete-dead-code:
- `scripts/utils/common.js` -- delete -- dead-weight re-export shim
- `scripts/utils/index.js` -- modify -- remove `export * from "./common.js"` (line 17)
- `scripts/bundle.mjs` -- modify -- remove `globalThis._buildSummary` writes (lines ~807, ~859)

Task migrate-to-typescript:
- `scripts/utils/logger.js` -> `logger.ts` -- rename + add types to logger methods
- `scripts/utils/exec.js` -> `exec.ts` -- rename + add ExecOptions/ExecResult interfaces, fix JSDoc
- `scripts/utils/fs.js` -> `fs.ts` -- rename + add types + fix `node:` prefix (lines 4-5)
- `scripts/utils/paths.js` -> `paths.ts` -- rename + add types + fix `node:` prefix (line 4)
- `scripts/utils/packages.js` -> `packages.ts` -- rename + add types + fix `node:` prefix (lines 1-2) + remove backward-compat re-export (line 123)
- `scripts/utils/package-info.js` -> `package-info.ts` -- rename + add types + fix `node:` prefix (line 4)
- `scripts/utils/index.js` -> `index.ts` -- rename + update re-export paths
- `scripts/check.mjs` -> `check.ts` -- rename + remove shebang + add types + add JSDoc + tabs->2-space + `console.error`->`logger.error` (line 101) + fix `logger.error` API misuse (line 94) + update `./scripts/bundle.mjs` ref (line 31)
- `scripts/clean.mjs` -> `clean.ts` -- rename + remove shebang + add types + add JSDoc + tabs->2-space + `console.error`->`logger.error` (line 92) + fix `logger.error` API misuse (line 85)
- `scripts/coverage.mjs` -> `coverage.ts` -- rename + remove shebang + add types + tabs->2-space + `process.cwd()`->`projectRoot` (line 40) + standardize main-module guard (line 156) + fix JSDoc `{string}`->TS types (lines 99-101)
- `scripts/release.mjs` -> `release.ts` -- rename + remove shebang + add types + add JSDoc + tabs->2-space + fix `node:` prefix (lines 2-4) + replace 7 `execSync` calls with `execCommand`/`execCommandInherited` (lines 126-152) + standardize main-module guard (line 161)
- `scripts/sync.mjs` -> `sync.ts` -- rename + add types + add JSDoc + tabs->2-space + standardize main-module guard (line 194)
- `scripts/bundle.mjs` -> `bundle.ts` -- rename + add types + add JSDoc + tabs->2-space + replace 3 `npx`->`bunx` (lines 93, 120, 414) + replace `node`->`bunx` (line 558) + replace 13 `console.*`->`logger` (lines 178, 289, 291, 474, 529, 596, 811, 814, 818, 849, 853, 872) + remove shebang (none currently, confirmed)
- `package.json` -- modify -- scripts entries: `.mjs` -> `.ts` (6 entries)
- `tsconfig.lint.json` -- modify -- include patterns: add `scripts/**/*.ts`, add `scripts/utils/**/*.ts`

Task derive-dependency-graph:
- `scripts/bundle.ts` -- modify -- replace `BUILD_ORDER` constant (line 29) and `DEPENDENCY_GRAPH` constant (line 32) with runtime topological sort from `packages/*/package.json`

Task split-bundle:
- `scripts/bundle.ts` -- modify -- becomes thin entry (~60 lines: parse args -> call orchestrate -> report -> exit)
- `scripts/bundle/config.ts` -- create -- BUILD_CONFIG, VARIANTS, shared types
- `scripts/bundle/cache.ts` -- create -- isCacheValid + updateCache + cleanCache + hashing
- `scripts/bundle/esbuild-build.ts` -- create -- buildBundle + buildIndividualModules + import-extension fixing
- `scripts/bundle/optimize.ts` -- create -- applyTerser + fixMinifiedImports
- `scripts/bundle/declarations.ts` -- create -- buildDeclarations + copyDeclarationFiles
- `scripts/bundle/validate.ts` -- create -- validateBuildArtifacts
- `scripts/bundle/metrics.ts` -- create -- calculateFileMetrics + calculateMetrics -> sizes.json
- `scripts/bundle/orchestrate.ts` -- create -- dependency-ordered parallel build (uses derived graph)

### Tests view
Scripts have no dedicated tests (scripts.md > Verification Checklist: "bun lint exits 0 -- scripts are in the lint tsconfig"; scripts/AGENTS.md > Testing: "Scripts have no dedicated tests. Correctness is validated by `bun check` / `bun bundle` exiting 0 in CI"). Verification for every task is toolchain-level: `bun lint` exits 0, `bun check` exits 0, `bun bundle` exits 0, `bun coverage` exits 0.

### Docs view
No package docs affected -- scripts are internal build tooling, not published API. The one doc change is the accepted guide-update proposal from the audit: `guides/scripts.md` > Verification Checklist gains a raw `spawn` exception clause for scripts that must resolve on non-zero exit (e.g., coverage capturing output from failing tests). Per docs.md > Template Selection, guide files are not API docs -- no Function/Concept/Pattern template applies.

---

## [ ] Apply guide-update proposal: raw spawn exception
**Type:** Docs
**Depends on:** None

### Strategy
The audit found that `coverage.mjs`'s `runCapture` function (lines 28-51) justifiably uses raw `spawn` because `execCommand` rejects on non-zero exit (`exec.js:51-58`: `if (code === 0) resolve(...); else reject(...)`), but `runCapture` must resolve regardless of exit code so the coverage table renders even when tests fail. The guide's checklist item "Uses `execCommand` / `execCommandInherited` not raw `spawn`" is too absolute. The exception is narrow: a script that must capture output from a process that intentionally exits non-zero, justified with a JSDoc comment explaining the non-rejecting contract. This task runs first so the migration task (migrate-to-typescript) does not re-flag `runCapture` as a violation.

### Definition of Done
- [ ] `guides/scripts.md` > Verification Checklist > Utils usage section includes the exception clause on the `spawn` checklist item
- [ ] The exception is general (references the pattern "capture with non-zero exit", not "coverage.mjs's runCapture")
- [ ] The exception requires a JSDoc comment explaining the non-rejecting contract
- [ ] Audit skill run on `scripts/coverage.mjs` (or `.ts` post-migration) reports no deviation for the `runCapture` spawn

---

## [ ] Delete dead code
**Type:** Code
**Depends on:** None

### Strategy
Three pieces of dead code complicate the migration and should be removed first. (1) `scripts/utils/common.js` is a 5-line backward-compat shim that re-exports from `logger.js`, `fs.js`, `exec.js`, `paths.js` -- but `index.js` lines 7-10 ALREADY re-export from those same files directly, then line 17 does `export * from "./common.js"`, creating duplicate export resolution for every symbol. No script imports from `common.js` directly (grep confirms zero `from.*common` callers outside `index.js`). (2) `index.js` line 17 (`export * from "./common.js"`) is the duplicate re-export that makes `common.js` reachable. (3) `globalThis._buildSummary` is set twice in `bundle.mjs` (lines ~807 and ~859) but never read anywhere -- grep confirms zero read sites. `coverage.mjs` invokes `bundle.mjs` as a separate process (`execCommand("bun", ["./scripts/bundle.mjs"...])`), so the mutation cannot cross the process boundary. The build summary is printed directly by `bundle.mjs`'s own functions in the same process.

### Definition of Done
- [ ] `scripts/utils/common.js` does not exist
- [ ] `scripts/utils/index.js` no longer contains `export * from "./common.js"`
- [ ] Grep for `_buildSummary` across `scripts/**` returns zero results
- [ ] `bun lint` exits 0
- [ ] `bun check` exits 0
- [ ] `bun bundle` exits 0

---

## [ ] Migrate all scripts to TypeScript
**Type:** Code
**Depends on:** delete-dead-code

### Strategy
This is the atomic migration -- all 14 scripts files rename from `.mjs`/`.js` to `.ts` in one task because internal cross-references (`check.mjs` references `./scripts/bundle.mjs` on line 31; `coverage.mjs` references it on lines 59, 78) must update atomically. Bun resolves `.js` import paths to `.ts` files (TypeScript convention: write `.js` in imports, the resolver checks for `.ts`), so ESM `import ... from "./utils/index.js"` paths remain correct after renaming `index.js` to `index.ts` -- no import-path rewriting needed within the scripts. The `package.json` scripts entries use shell commands (`bun ./scripts/check.mjs`), not ESM imports, so those MUST change to `.ts`. The `tsconfig.lint.json` include glob currently has `"scripts/**/*.mjs"` -- add `"scripts/**/*.ts"` so the renamed files remain in the lint program.

Per-file changes (audit findings each addresses):

**Utils (7 files):**
- All: tabs -> 2-space indent; `{string}`/`{Array}`/`{Object}` JSDoc annotations -> TS types (`@param command: string` not `@param {string} command`); add `node:` prefix to bare builtin imports (`"fs"` -> `"node:fs"`, `"path"` -> `"node:path"`, `"child_process"` -> `"node:child_process"`)
- `logger.ts`: add `Logger` interface type for the logger object; type method params (`message: string`, `error?: Error`)
- `exec.ts`: add `ExecOptions` interface (`timeout?: number`, `stdio?: StdioOptions`, `[key: string]: unknown`); add `ExecResult` type (`{ stdout: string; stderr: string; code: number }`); type both function signatures
- `fs.ts`: type all functions (`filePath: string`, `dirPath: string`, `data: unknown` for `writeJson`); add generic `readJson<T>` return
- `paths.ts`: type function params (`packageName: string`); type `getPackagePaths` return object
- `packages.ts`: type `getAllPackages` return (`PackageInfo[]`); remove line 123 backward-compat re-export (`export { projectRoot, ... } from "./paths.js"` -- `index.ts` already re-exports from `paths.ts` directly)
- `package-info.ts`: type `getPackageInfo` return; type `isValidPackage` signature
- `index.ts`: remove common.js re-export line (already done in delete-dead-code); update paths from `.js` to keep convention

**Entry scripts (6 files):**
- All: remove `#!/usr/bin/env node` shebangs (check, clean, coverage, release -- sync and bundle have none); tabs -> 2-space; add JSDoc on every function; standardize main-module guard to `if (import.meta.main)` (bun-native boolean; currently 3 patterns coexist: `NODE_ENV !== "test"`, `import.meta.url === ...`, and no guard at all in coverage)
- `check.ts`: `console.error("Fatal error:", error)` (line 101) -> `logger.error("Fatal error:", error)`; fix `logger.error("Check script failed", { error: error.message })` (line 94) -> `logger.error("Check script failed", error)` (logger expects `(message, error?: Error)` not a wrapped object); update `./scripts/bundle.mjs` reference (line 31) -> `./scripts/bundle.ts`
- `clean.ts`: `console.error("Fatal error:", error)` (line 92) -> `logger.error(...)`; fix `logger.error("Clean failed", { error: error.message })` (line 85) -> `logger.error("Clean failed", error)`
- `coverage.ts`: `process.cwd()` fallback (line 40) -> `projectRoot`; fix JSDoc `{string}` annotations (lines 99-101) -> TS types; add main-module guard (currently has none -- line 156 calls `main()` unconditionally, meaning importing the file triggers execution)
- `release.ts`: fix `import { execSync } from "child_process"` (line 2) -> `node:child_process`; `import fs from "fs"` (line 3) -> `node:fs`; `import path from "path"` (line 4) -> `node:path`; replace 7 `execSync` calls (lines 126, 129, 130, 131, 134, 136, 152) with async equivalents: `git status --porcelain` + `git diff --cached --name-only` -> `execCommand` (capture stdout); `git config` + `git add` + `git commit` + `changeset publish` -> `execCommandInherited` (terminal passthrough); `publish()` is already `async`
- `sync.ts`: standardize main-module guard (line 194)
- `bundle.ts`: replace `execCommand("npx", buildArgs, ...)` (lines 93, 414) -> `execCommand("bunx", ["esbuild", ...], ...)`; replace `execCommand("npx", ["terser", ...], ...)` (line 120) -> `execCommand("bunx", ["terser", ...], ...)`; replace `execCommand("node", tscArgs, ...)` (line 558) -> `execCommand("bunx", ["tsc", ...], ...)`; replace 13 `console.log`/`console.warn`/`console.error` calls -> `logger.info`/`logger.warn`/`logger.error`

**Config files (2 files, incidental to the rename):**
- `package.json`: 6 scripts entries change `.mjs` -> `.ts` (`check`, `bundle`, `clean`, `coverage`, `release`, `sync`)
- `tsconfig.lint.json`: add `"scripts/**/*.ts"` and `"scripts/utils/**/*.ts"` to `include` array (the current `"scripts/**/*.mjs"` glob can remain -- harmless, and removing it can be deferred)

### Definition of Done
- [ ] Every file under `scripts/**/*.ts` (no `.mjs` or `.js` files remain except `utils/happydom.js` which is excepted)
- [ ] `bun lint` exits 0
- [ ] `bun check` exits 0
- [ ] `bun bundle` exits 0
- [ ] `bun coverage` exits 0
- [ ] No `#!/usr/bin/env node` shebangs in any scripts file
- [ ] No `npx` or `node` invocations in any scripts file (grep for `"npx"` and `"node"` as exec commands returns zero outside `node:` import prefixes)
- [ ] No `console.log`, `console.warn`, or `console.error` in any scripts file except `logger.ts` (the wrapper)
- [ ] No `execSync` in any scripts file
- [ ] No tab indentation in any scripts file (grep for `^\t` returns zero)
- [ ] No `{string}`, `{Object}`, `{Array}`, `{Promise}` JSDoc annotations in any scripts file
- [ ] Every exported function in `scripts/utils/` has JSDoc with TS-typed `@param` / `@returns`
- [ ] `package.json` scripts entries reference `.ts` files, not `.mjs`
- [ ] `tsconfig.lint.json` include array contains `scripts/**/*.ts`
- [ ] All entry scripts use `if (import.meta.main)` as the main-module guard (consistent pattern)
- [ ] `logger.error` callers pass `Error` objects, not wrapped `{ error: ... }` objects
- [ ] `coverage.ts` uses `projectRoot` not bare `process.cwd()`
- [ ] Internal `./scripts/bundle.mjs` references in `check.ts` and `coverage.ts` updated to `./scripts/bundle.ts`

---

## [ ] Derive dependency graph from package.json
**Type:** Code
**Depends on:** migrate-to-typescript

### Strategy
`bundle.ts` currently hardcodes `BUILD_ORDER` (line 29: `["core", "css", "dom", "store", "router", "resource", "ui"]`) and `DEPENDENCY_GRAPH` (line 32: a map of package -> dependency array). The `ui` package does not exist -- already drifted. Replace both with a runtime derivation: read each `packages/*/package.json`, filter `dependencies` and `peerDependencies` to `@hellajs/*` prefixes, strip the `@hellajs/` prefix to get the local package name, topologically sort. The derivation runs once at module load and exports `buildOrder: string[]` and `getDependencies(packageName: string): string[]`. Plugins under `plugins/*/package.json` that depend on `babel-plugin-hellajs` are not part of the package build graph (they are build separately by the babel plugin's own tsconfig). The existing `packages.ts` util already has `getAllPackages()` which reads every `package.json` -- reuse it.

### Definition of Done
- [ ] `BUILD_ORDER` constant does not exist in `scripts/bundle.ts`
- [ ] `DEPENDENCY_GRAPH` constant does not exist in `scripts/bundle.ts`
- [ ] Grep for `BUILD_ORDER` and `DEPENDENCY_GRAPH` across `scripts/**` returns zero results
- [ ] Build order is derived at runtime from `packages/*/package.json` dependencies
- [ ] `bun bundle` exits 0
- [ ] `bun check` exits 0
- [ ] Adding a new `packages/*/package.json` with a `@hellajs/*` dependency automatically includes it in the build order without code changes (manual verification: temporarily add a dummy entry, confirm it appears in build order, remove it)

---

## [ ] Split bundle into concern modules
**Type:** Code
**Depends on:** derive-dependency-graph

### Strategy
`bundle.ts` (post-migration, ~875 lines) is eight concerns in one file. Split along the natural seams documented in `scripts/AGENTS.md` > Target architecture. Each file in `scripts/bundle/` owns one concern and exports typed functions. The thin `scripts/bundle.ts` entry parses args, calls `orchestrate()` which runs the pipeline, reports results, and exits. The split moves existing code -- it does not rewrite logic. The dependency-graph derivation (task derive-dependency-graph) moves into `orchestrate.ts`. Import paths between the new files use the `.js` extension convention (TypeScript resolves to `.ts`).

File responsibilities (from scripts/AGENTS.md target layout):
- `config.ts` -- `BUILD_CONFIG`, `VARIANTS`, shared types (BuildResult, BuildSummary, etc.)
- `cache.ts` -- `isCacheValid`, `updateCache`, `cleanCache`, file hashing
- `esbuild-build.ts` -- `buildBundle` (esbuild lib/index.ts -> bundle.js), `buildIndividualModules` (per-module transpile), import-extension fixing
- `optimize.ts` -- `applyTerser`, `fixMinifiedImports` (the 4-pass regex)
- `declarations.ts` -- `buildDeclarations` (tsc --emitDeclarationOnly), `copyDeclarationFiles`
- `validate.ts` -- `validateBuildArtifacts`
- `metrics.ts` -- `calculateFileMetrics`, `calculateMetrics` -> writes `dist/sizes.json`
- `orchestrate.ts` -- `buildPackage` (the pipeline for one package), `buildPackagesParallel` (dependency-ordered parallel execution with derived graph)
- `bundle.ts` (entry, ~60 lines) -- parse args, call `orchestrate()`, print summary, exit

### Definition of Done
- [ ] `scripts/bundle.ts` is under 80 lines (thin entry: parse -> orchestrate -> report -> exit)
- [ ] `scripts/bundle/` directory exists with 8 `.ts` files (config, cache, esbuild-build, optimize, declarations, validate, metrics, orchestrate)
- [ ] Each file in `scripts/bundle/` is under 300 lines
- [ ] No function in `scripts/bundle/` exceeds ~80 lines
- [ ] `bun bundle` exits 0
- [ ] `bun check` exits 0
- [ ] `bun coverage` exits 0
- [ ] `bun lint` exits 0
- [ ] Each file in `scripts/bundle/` has JSDoc on every exported function with TS-typed `@param` / `@returns`
