---
applyTo: "scripts/**"
---

<scripts-instructions>

  Build tooling and CI automation. These scripts bundle, test, lint, sync, and release the six packages. They run under `bun` (never `node`) in dev and CI. Style target: `guides/scripts.md` — TS, one concern per file, shared utils. The current code is `.mjs`/`.js` with tabs and `node`/`npx` invocations; the plan skill drives the migration to the target.

  ## Scripts (CLI entries — one per `package.json` scripts row)

  | Script | What it does |
  |---|---|
  | `check.mjs` | Orchestrator: lint → bundle → test. `bun check [package]` scopes to one workspace. Preferred over `bun test`. |
  | `bundle.mjs` | Build `dist/` per package: esbuild bundle + per-module transpile, terser minified variant, `.d.ts` generation + copy, artifact validation, size metrics, hash-based cache, dependency-ordered parallel orchestration. **875 lines — split target.** |
  | `coverage.mjs` | `bun bundle` then `bun test --coverage`, filtered to the target package. CI runs this. |
  | `clean.mjs` | Remove `dist/` + `.build-cache/` per package. |
  | `release.mjs` | Changeset-driven publish after `bun bundle`. |
  | `sync.mjs` | Regenerate `CLAUDE.md` + `.github/instructions/*` from every `AGENTS.md`. |

  Each entry parses `process.argv` for an optional package name (first non-`--` arg) and `--flags`, validates via `isValidPackage`, then runs. The arg-parse pattern is duplicated across scripts — extract candidate for `utils/args.ts`.

  ## Shared utils (`scripts/utils/`)

  | File | Exports | Notes |
  |---|---|---|
  | `index.js` | `export *` barrel | The single import path scripts use |
  | `logger.js` | `logger.{info,success,warn,error}` | Prefixed console wrappers |
  | `exec.js` | `execCommand`, `execCommandInherited` | spawn + timeout + stdio capture/passthrough |
  | `fs.js` | `ensureDir`, `readJson`, `writeJson`, `scanDirRecursive`, `fileExists` | fs helpers |
  | `paths.js` | `projectRoot`, `packagesDir`, `pluginsDir`, `getPackagePath`, `getPackagePaths` | resolved paths |
  | `packages.js` | `isValidPackage`, package enumeration | |
  | `package-info.js` | `getPackageInfo` | distDir, dir, peerDeps, tsconfigPath, cacheDir |
  | `common.js` | re-export shim | **Dead weight** — duplicates `index.js`. Delete on migration. |

  ## Bundle pipeline (the build flow `bundle.mjs` runs per package)

  ```
  buildPackage(packageName)
    ├─ isCacheValid? (file hashes + git status) → skip if hit
    ├─ cleanBuildDir(distDir)
    ├─ buildBundle        → esbuild lib/index.ts → bundle.js + bundle.min.js (terser)
    ├─ buildIndividualModules → esbuild per .ts module → preserve dir structure
    │   └─ fix imports: add .js ext; minified variant rewrites → .min.js
    ├─ buildDeclarations  → tsc --emitDeclarationOnly
    ├─ copyDeclarationFiles → copy hand-written lib/types/*.d.ts
    ├─ validateBuildArtifacts → non-empty bundle.js + index.d.ts
    ├─ calculateMetrics   → dist/sizes.json
    └─ updateCache        → .build-cache/build-cache.json
  ```

  Parallel orchestration: `buildPackagesParallel` respects `DEPENDENCY_GRAPH`, runs up to `maxParallel` (min CPUs, 4) concurrently, stops if `core` fails (everything depends on it).

  ## Target architecture (the split the plan skill derives toward)

  `bundle.mjs` is eight concerns in one file. Target: `scripts/bundle/` with one file per concern, thin entry.

  | Target file | Concern (currently in bundle.mjs) |
  |---|---|
  | `scripts/bundle.ts` | Thin entry: parse args → call orchestrate → report → exit |
  | `scripts/bundle/orchestrate.ts` | Dependency-ordered parallel build (derived from package.json, not hardcoded) |
  | `scripts/bundle/esbuild-build.ts` | `buildBundle` + `buildIndividualModules` + import-extension fixing |
  | `scripts/bundle/optimize.ts` | `applyTerser` + `fixMinifiedImports` (the 4-pass regex) |
  | `scripts/bundle/declarations.ts` | `buildDeclarations` + `copyDeclarationFiles` |
  | `scripts/bundle/cache.ts` | `isCacheValid` + `updateCache` + `cleanCache` + hashing |
  | `scripts/bundle/validate.ts` | `validateBuildArtifacts` |
  | `scripts/bundle/metrics.ts` | `calculateFileMetrics` + `calculateMetrics` → sizes.json |
  | `scripts/bundle/config.ts` | `BUILD_CONFIG`, `VARIANTS`, dependency graph (derived from package.json) |

  ## Known fragile / drift points

  - **Hardcoded `BUILD_ORDER` + `DEPENDENCY_GRAPH`** — duplicates `packages/*/package.json` dependencies. Drifts when a package adds a dep. Target: derive from package.json at load time.
  - **Minified-import fixing is 4 regex passes** on built output (`from"..."` and `import(...)` for both `.js`→`.min.js` and extension-adding). String manipulation on built JS breaks silently if the bundler output format changes. Target: consider esbuild's `--out-extension` + `--entry-names` to emit correct extensions directly, eliminating the regex.
  - **`globalThis._buildSummary`** — untyped mutation passing build results from `bundle` to `coverage`. Crosses a process boundary via a global. Target: `coverage` reads `dist/sizes.json` (already written) instead.
  - **`common.js`** — backward-compat shim duplicating `index.js`. Delete on migration.
  - **`.mjs` / `.js` mix** — top-level scripts are `.mjs`, utils are `.js`. Target: all `.ts`.
  - **Tabs, not spaces** — scripts use tabs; packages use 2-space. Target: 2-space per `scripts.md`.
  - **`node` / `npx` invocations** in `bundle.mjs` (`npx esbuild`, `npx terser`, `node tscPath`) — violates "always bun." Target: `bunx`.
  - **No JSDoc** on most functions; utils use `{string}` / `{Object}` JSDoc types, not TS.

  ## Testing

  Scripts have no dedicated tests. They run via `NODE_ENV !== "test"` guards (the `if (process.env.NODE_ENV !== "test")` block before `main()`), so importing them in a test environment does not trigger execution. Coverage instruments `dist/` (the package bundles), not the scripts themselves — script correctness is validated by `bun check` / `bun bundle` exiting 0 in CI.
</scripts-instructions>
