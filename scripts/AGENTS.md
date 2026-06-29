<scripts-instructions>

  Build tooling and CI automation. These scripts bundle, test, lint, sync, and release the six packages. They run under `bun` (never `node`) in dev and CI, are authored in TS (one concern per file, shared utils), and follow `guides/scripts.md`.

  ## Scripts (CLI entries under `scripts/`)

  | Script | What it does |
  |---|---|
  | `check.ts` | Orchestrator: bundle → test → lint. `bun check [package]` scopes to one workspace (incl. its plugin tests). **NEVER run `bun test` directly — it runs against stale bundles.** |
  | `bundle.ts` | Thin entry (55 lines): parse args → call `bundle/orchestrate.ts` → report. Flags: `[package]`, `--size-mode` (minified bundle variant only), `--clean` (purge dist + cache first). Callers pass `--quiet` but bundle does not read it. |
  | `coverage.ts` | bundle → `bun test --coverage` → lint. Filters the coverage table to `[package]` rows and recalculates the `All files` average (Bun has no scope flag; the test preload forces `@hellajs/dom` into the instrumented set). CI runs this. |
  | `clean.ts` | Remove `dist/` + `.build-cache/` per package. `bun clean [package]` scopes to one workspace. |
  | `release.ts` | Update `@hellajs/core` peer deps + `babel-plugin-hellajs` deps across packages, commit (`--no-verify`), then `changeset publish`. Run via `bun release` (the npm script bundles first). |
  | `sync.ts` | Regenerate `CLAUDE.md` + `.github/instructions/*` from every `AGENTS.md` under root + `packages/`/`plugins/`/`docs/`/`scripts/`. Root → `.github/copilot-instructions.md` (`applyTo: "**"`); folders → `{folder}.instructions.md`. |
  | `sync-skills.ts` | Chained after `sync.ts` by the `sync` npm script. Shallow-clone `omilli/ai-brain` and mirror its `brain-*` skills into `.agents/skills/`, leaving non-`brain-*` skills (`comparison/`) untouched. Flags: `--dry-run`, `--remote=<url>`. Prints `git diff --stat .agents/skills/`. |
  | `type-visibility.ts` | Guard (`bun visibility`): fail if any `lib/types*.d.ts` that is wholesale re-exported (`export type * from "./types[…]"`) contains `@internal`-tagged types — those would leak as public. No package scoping; scans every package. |

  Each entry parses `process.argv` for an optional package name (first non-`--` arg) and `--flags`, validates via `isValidPackage`, then runs. The arg-parse pattern is duplicated across `check`/`clean`/`coverage`/`bundle` — extract candidate for `utils/args.ts`.

  ## Shared utils (`scripts/utils/`, all `.ts`)

  | File | Exports |
  |---|---|
  | `index.ts` | `export *` barrel — the single import path scripts use |
  | `logger.ts` | `logger.{info,success,warn,error}` (emoji-prefixed console wrappers); `Logger` |
  | `exec.ts` | `execCommand` (capture), `execCommandInherited` (passthrough); `ExecOptions`, `ExecResult` |
  | `fs.ts` | `fileExists`, `ensureDir`, `readJson`, `writeJson`, `scanDirRecursive` |
  | `paths.ts` | `projectRoot`, `packagesDir`, `pluginsDir`, `testsDir`, `scriptsDir`, `changesetDir`, `getPackagePath`, `getPackagePaths` |
  | `packages.ts` | `getAllPackages`, `getPackageDirectories`, `getPackagesWithChangesets`; `PackageEntry` |
  | `package-info.ts` | `getPackageInfo`, `isValidPackage`; `PackageInfo` |

  `projectRoot = path.resolve(process.cwd())` — scripts assume cwd is the repo root (npm scripts guarantee this).

  ## Bundle pipeline (`scripts/bundle/`, one concern per file)

  Entry `bundle.ts` → `orchestrate.ts::buildSinglePackageEntry` (retry up to `BUILD_CONFIG.maxRetries`):

  ```
  buildSinglePackageEntry(packageName, cwd)
    ├─ getPackageInfo(packageName)                  // utils/package-info.ts
    ├─ if --clean: cleanBuildDir(distDir) + cleanCache(cacheDir)
    ├─ isCacheValid(dir, cacheDir) && distExists?   → return cached
    ├─ cleanBuildDir(distDir)
    ├─ buildBundle(packageInfo, cwd, bundleMode)    // esbuild lib/index.ts → bundle.js (+ bundle.min.js via terser)
    ├─ buildIndividualModules(packageInfo, cwd)     // esbuild per lib/**/*.ts → dist/**, .js imports fixed (+ .min.js)
    ├─ buildDeclarations(packageInfo, cwd)          // bunx tsc --emitDeclarationOnly
    ├─ copyDeclarationFiles(packageInfo)            // lib/**/*.d.ts → dist/
    ├─ validateBuildArtifacts(dir)                  // non-empty bundle.js + index.d.ts + sourcemaps
    ├─ calculateMetrics(packageInfo, metrics)       // → dist/sizes.json
    └─ updateCache(dir, cacheDir, metrics)          // → .build-cache/build-cache.json
  ```

  Parallel orchestration: `buildPackagesParallel` respects `derivePackageGraph()` (Kahn topological sort over `@hellajs/*` deps declared in each `packages/*/package.json`), runs up to `maxParallel` (min CPUs, 4) concurrently, and aborts if `core` fails (every other package depends on it).

  ### Module layout

  | File | Concern |
  |---|---|
  | `bundle.ts` | Thin entry: args → orchestrate → report → exit |
  | `bundle/config.ts` | `BUILD_CONFIG`, `VARIANTS`, `BuildResult`/`BuildSummary`/`PackageGraph`/`BuildMetrics` types, `derivePackageGraph()` |
  | `bundle/orchestrate.ts` | `buildSinglePackageEntry` (retry), `buildPackagesParallel` (dependency-aware), `buildAllPackagesFromOrder`, `reportSummary`/`reportSingleResult` |
  | `bundle/esbuild-build.ts` | `buildBundle` + `buildIndividualModules` + inline import-extension / minified-path rewriting |
  | `bundle/optimize.ts` | `applyTerser` (bunx terser) + `fixMinifiedImports` (4-pass regex) |
  | `bundle/declarations.ts` | `buildDeclarations` (bunx tsc) + `copyDeclarationFiles` |
  | `bundle/cache.ts` | `calculateFileHash` + `isCacheValid` + `cleanCache` + `updateCache` |
  | `bundle/validate.ts` | `validateBuildArtifacts` |
  | `bundle/metrics.ts` | `calculateFileMetrics` + `calculateMetrics` → `dist/sizes.json` |

  ## Known fragile point

  - **Minified-import rewriting is regex on built JS**, duplicated in `optimize.ts::fixMinifiedImports` (4 passes: `from "…"` and `import(…)` for extension-adding and `.js`→`.min.js`) and inline in `esbuild-build.ts::buildBundle`/`buildIndividualModules`. Breaks silently if esbuild's output format changes. Target: emit correct extensions directly via esbuild `--out-extension` / `--entry-names` and delete the regex.

  ## Testing

  Scripts have no dedicated tests. Each entry guards execution with `if (import.meta.main)`, so importing a script (e.g. from a test) does not run it. Coverage instruments `dist/` (the package bundles), not the scripts — script correctness is validated by `bun check` / `bun bundle` exiting 0 in CI.
</scripts-instructions>
