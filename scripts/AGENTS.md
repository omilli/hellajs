<scripts-instructions>

  Build tooling and CI automation. These scripts bundle, test, lint, and release the six packages. They run under `bun` (never `node`) in dev and CI, are authored in TS (one concern per file, shared utils), and follow `guides/scripts.md`.

  ## Scripts (CLI entries under `scripts/`)

  | Script | What it does |
  |---|---|
  | `bundle.ts` | Thin entry (55 lines): parse args → call `bundle/orchestrate.ts` → report. Flags: `[package]`, `--size-mode` (minified bundle variant only), `--clean` (purge dist + cache first). Callers pass `--quiet` but bundle does not read it. |
  | `coverage.ts` | bundle → `bun test --coverage` → lint. With `[package]`: tests + eslint scope to it (tsc + guards stay repo-wide — foreign failures are triaged per root AGENTS.md §Testing), and the coverage table filters to its rows with the `All files` average recalculated (Bun has no scope flag; the test preload forces `@hellajs/dom` into the instrumented set). CI runs this unscoped. |
  | `bench.ts` | Thin entry: parse args (`--variant`, `--runs`, `--throttle`, `--label`, `--ops`, `--headed`) → build + stage → serve → drive → report. Playwright + system Chrome macro-benchmark over `examples/bench`; appends self-describing entries to `.bench/results.md`. |
  | `plans.ts` | Thin entry: parse args (`<set-folder>`, `--probe`, `--model=<provider/id[:thinking]>`) → validate set + venue → run pipeline → report → exit. Fresh `pi --mode rpc` instance per unticked plan unit (worker skill executes it); dialogs + steering relayed to the terminal; unflipped markers auto-continue on tick progress, else ask-retry-skip-halt gate. Fails fast if `.agents/skills/worker/scripts/worktree.mjs` exists (skill-automation 02 upgrades it to component mode). |
  | `clean.ts` | Remove `dist/` + `.build-cache/` per package. `bun clean [package]` scopes to one workspace. |
  | `release.ts` | Update `@hellajs/core` peer deps + `babel-plugin-hellajs` deps across packages, commit (`--no-verify`), then `changeset publish`. Run via `bun release` (the npm script bundles first). |
  | `type-visibility.ts` | Guard (`bun visibility`): fail if any `lib/types*.d.ts` that is wholesale re-exported (`export type * from "./types[…]"`) contains `@internal`-tagged types — those would leak as public. No package scoping; scans every package. |
  | `dead-exports.ts` | Guard (`bun dead-exports`): fail if any exported `function`/`const`/`let`/`class` across packages and plugins has zero value-position references across all source, tests, and docs. No package scoping; type-only exports out of scope. |
  | `jsdoc-params.ts` | Guard (`bun jsdoc-params`): fail if any `function` declaration's JSDoc carries a `@param` tag whose name does not match an actual parameter (catches the `@param boundaryElement` vs `currentBoundary` drift that `tsc`/`eslint` miss). No package scoping; arrow-function `const`s, class methods, and destructuring params out of scope (conservative skip). |
  | `doc-structure.ts` | Guard (`bun lint:structure`), five checks: fence parity (every mdx in packages/docs, examples' `tutorial.mdx`, `docs/src/pages` has an even top-level fence count), tutorial Complete-Code parity (`### src/...` blocks byte-match the real files; undocumented real files flagged; `vite-env.d.ts` exempt; single-file apps — no src headings, exactly one src file — fall back to the Complete-Code section's lone fence, which must byte-match that file), anchor resolution (site `#`-fragments resolve against the target page's heading-derived slugs — thin wrappers contribute their imported package docs' headings, one alias hop), wrapper validity (frontmatter `title`/`description`/`layout` everywhere; import-rendering wrappers carry only imports, component tags, and `border-t` dividers; site-authored content pages and `index.mdx` enumeration pages exempt), nav/index registration (every learn/reference/plugins page appears in `docs/src/nav.ts` and every nav entry has a page; learn content pages also appear in `learn/index.mdx` / `learn/patterns/index.mdx`). |
  | `doc-snippets.ts` | Audit tool (`bun doc-snippets` — informational, not composed into guards): typechecks package-doc + site-page code blocks. Per-doc emission: fenced ts/tsx/jsx blocks → one `.tsx` module (doc-wide import union hoisted + merged; blocks nested `{ }` scopes inside an async IIFE — chaining legal, same-name reuse shadows), js-tagged blocks → sibling `.js` module parsed with `checkJs: false`. Skips ❌ blocks, exercise-blank blocks, signature-only blocks, and blocks importing externals. Two-pass tsc (`jsx: preserve`, `@hellajs/*` path mappings): grammar-error files quarantined via config exclude, then semantics. Relative-specifier TS2307 exempted (notional doc-internal modules). Diagnostics carry `// AUDITSRC` breadcrumbs (mdx line). Strict tier (package docs + site pages) gates exit; tutorials report only. Writes gitignored `.doc-snippets/` into a per-run `run-<pid>-<suffix>/` scratch dir — stale dead-run dirs are pruned at start (live-pid probe), so concurrent runs can never wipe each other's corpus. |
  | `doc-links.ts` | Guard (`bun doc-links`), two checks. Export-name: fail if a doc link's display name is not a barrel export of its target package — catches `streamSsr` vs `ssr` rename drift that `tsc`/`eslint` miss. Recognizes `/reference/<pkg>/<slug>` (`.mdx`) and `/@hellajs/<pkg>` (JSDoc); skips non-identifier display names, package-root links, and `#`-anchor member links (conservative skip). Page-existence: fail if an internal site URL (`/learn`, `/reference`, `/plugins` — markdown link or `href`) matches no `.mdx` under `docs/src/pages/` (index.mdx serves its directory URL; anchors/queries stripped) — catches renamed-page, wrong-slug, and dropped-wrapper link rot. No package scoping; scans every package's `docs/` + `lib/`, every plugin's `src/`, `docs/src/pages/`, and each example's `tutorial.mdx`. |
  | `em-dash.ts` | Guard (`bun em-dash`): fail if any user-facing file contains an em/en dash or its HTML entity (`—`, `–`, `&mdash;`, `&ndash;`, `&#8212;`, `&#8213;`, `&#x2014;`, `&#x2013;`), fences included (tutorial code comments are user-visible). Reports `{relpath}:{line}` per hit. Allowlist-include scan (no package scoping): root + site READMEs, `packages/{pkg}/docs/**/*.mdx` + `README.md` + `CHANGELOG.md` + `{pkg}-comparison.md`, `plugins/{p}/README.md`, `examples/*/tutorial.mdx`, `docs/src/pages/**/*.mdx`, `.changeset/*.md`. Agent-only files (AGENTS.md, guides, memory, plans, source) exempt; rewrite conventions in `guides/docs.md` §Typography. |

  Each entry parses `process.argv` for an optional package name (first non-`--` arg) and `--flags`, validates via `isValidPackage`, then runs. The arg-parse pattern is duplicated across `clean`/`coverage`/`bundle` — extract candidate for `utils/args.ts`.

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

  ## Bench pipeline (`scripts/bench/`, one concern per file)

  Entry `bench.ts` → `build.ts` (rebuild all packages + the example variant, stage into `.bench/current/`) → `serve.ts` (static server on an ephemeral port) → `driver.ts` (Playwright, system Chrome, CDP CPU throttle) → `report.ts` (stdout + append-only `.bench/results.md`). The tool never mutates git state; the only git it runs is the read-only sha/dirty descriptor that labels each entry. Manual A/B protocol: `git checkout <ref>` → `bun bench` → checkout feature → `bun bench` → read `.bench/results.md`.

  | File | Concern |
  |---|---|
  | `bench.ts` | Thin entry: args → build → serve → drive → report → exit |
  | `bench/build.ts` | `bun bundle` (all packages — examples bundle against `dist/`, which is gitignored and survives checkouts) + variant build (`html`/`jsx`/`ts`) + staging into `.bench/current/` |
  | `bench/serve.ts` | `Bun.serve` on `port: 0`; `/<label>/` → `index.html`, other paths → files under `.bench/` |
  | `bench/ops.ts` | The 8 op definitions: setup clicks, pre-click capture, measured click, in-page end-state predicate |
  | `bench/driver.ts` | Playwright driver: capture-phase click listener (t0), rAF predicate poll (t1), 30s watchdog, CDP throttle, warmup + measured runs |
  | `bench/report.ts` | Env header + per-op median/mean table to stdout; append-only self-describing entry to `.bench/results.md` (only after every op verified) |

  ## Plans runner pipeline (`scripts/plans/`, one concern per file)

  Entry `plans.ts` → `set.ts` (list `NN-*.md` units in filename order, read top markers — read-only; the worker skill owns every tick) → `rpc.ts` (one `pi --mode rpc` child per unit: LF-only JSONL framing, id-correlated command responses, `agent_settled` tracking, dialog registry, child-exit detection as rejections) → `relay.ts` (terminal view: renders `extension_ui_request` dialogs and answers with exact option strings; one shared stdin line-reader also routes free-typed lines to steering and `.stop` to abort) → `stream.ts` (terminal stream view: text deltas verbatim, tool one-liners with args, partial tool output printed live as it accumulates, result summary at end) → `run.ts` (per-unit orchestration: `/skill:worker` prompt, settle → `get_last_assistant_text` report → top-marker check, auto-continue on tick progress / ask-retry-skip-halt gate when stalled, SIGINT abort-and-exit-1, final summary with session names). The runner never writes plan files and never starts the next unit after SIGINT or halt. Venue fail-fast: refuses to run when `.agents/skills/worker/scripts/worktree.mjs` exists (skill-automation 02 adapts the runner to component mode in the same unit that lands the worktree protocol).

  | File | Concern |
  |---|---|
  | `plans.ts` | Thin entry: args → validate set + venue → run → report → exit |
  | `plans/set.ts` | Plan-set listing (`NN-*.md`, filename order) + top-marker reads; read-only |
  | `plans/rpc.ts` | pi RPC client: spawn, strict JSONL, command/event dispatch, dialog registry, `waitForSettled`, dispose |
  | `plans/relay.ts` | Terminal dialog rendering + answering, steer routing (`.stop` = abort), orchestrator prompts |
  | `plans/stream.ts` | Terminal stream view: text deltas verbatim, tool one-liners with args, live partial output diffing |
  | `plans/run.ts` | Per-unit orchestration: fresh instance, marker gate, summary, SIGINT |

  ## Testing

  Scripts have no dedicated tests. Each entry guards execution with `if (import.meta.main)`, so importing a script (e.g. from a test) does not run it. Coverage instruments `dist/` (the package bundles), not the scripts — script correctness is validated by `bun bundle` exiting 0 in CI.
</scripts-instructions>
