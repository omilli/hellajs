<scripts-instructions>

  Build tooling and CI automation. These scripts bundle, test, lint, and release the seven packages. They run under `bun` (never `node`) in dev and CI, are authored in TS (one concern per file, shared utils), and follow `guides/scripts.md`.

  ## Scripts (CLI entries under `scripts/`)

  | Script | What it does |
  |---|---|
  | `bundle.ts` | Thin entry (55 lines): parse args → call `bundle/orchestrate.ts` → report. Flags: `[package]`, `--size-mode` (minified bundle variant only), `--clean` (purge dist + cache first). Callers pass `--quiet` but bundle does not read it. |
  | `coverage.ts` | bundle → `bun test --coverage` → lint. With `[package]`: tests + eslint scope to it (tsc + guards stay repo-wide — foreign failures triaged per `guides/tests.md` §Triage & Gate Semantics), and the coverage table filters to its rows with the `All files` average recalculated (Bun has no scope flag; the test preload forces `@hellajs/dom` into the instrumented set). CI runs this unscoped. |
  | `bench.ts` | Thin entry: parse args (`--variant`, `--runs`, `--throttle`, `--label`, `--ops`, `--headed`) → build + stage → serve → drive → report. Playwright + system Chrome macro-benchmark over `examples/bench`; appends self-describing entries to `.bench/results.md`. |
  | `plans.ts` | Thin entry: parse args (`<set-folder>`, `--wt=single|split`, `--probe`, `--model=<provider/id[:thinking]>`) → validate set → run pipeline → report → exit. Fresh `pi --mode rpc` instance per unticked plan unit, executed inside a component worktree by the worker skill (`single`: one venue for the whole set; `split`: one per dependency-connected component, sequential); dialogs + steering relayed to the terminal; worktree-copy markers gate progress (auto-continue on tick progress, else retry / deliver-incomplete / abandon / halt — no per-unit skip inside a venue); the runner never merges — completed components stand and the run lists the set's outstanding slugs for the user-run `bun merge` (the single human checkpoint); the runner invokes `worktree.mjs` read-only (`list`/`status`) plus `clean` on explicit abandon — never `new` (worker-owned), never `diff`/`apply` (merge-owned). |
  | `merge.ts` | Thin entry: parse args (`<set-folder>`, `--model=<provider/id[:thinking]>`, `--dry-run`) → validate set → run merge → report → exit. Fresh `pi --mode rpc` instance per outstanding component worktree of the set (the `/skill:merge` per-component contract); queue derivation + completeness pre-check are mechanical; per-component progress gate on main-tree plan ticks + worktree cleanup; orchestrator-owned set index flip + union gate with one fix instance per red round; `--dry-run` previews the derived queue without spawning. |
  | `audits.ts` | Thin entry: parse args (`<package>`, `--section=code\|tests\|docs`, `--model=<provider/id[:thinking]>`, `--dry-run`) → resolve target (bare name or `packages/<name>`, `isValidPackage`) → run pipeline → report → exit. Fresh `pi --mode rpc` instance per package section (fixed code → tests → docs order) over the shared agent driver: `/skill:audit-<section>` prompt naming targets + the pre-computed findings set dir; the instance audits, then authors its own plan set under `plans/<pkg>/audit/<section>/` via the plan skill (three separate sets, one per section with findings). Set dir holds `NN-*.md` → findings captured; neither a set nor a clean statement → operator gate (retry / accept-clean / skip / halt; no auto-continue — no tick file progresses an audit). `--dry-run` prints derived sections + set dirs without spawning. The runner never audits and never writes plan content — instances do. |
  | `remote.ts` | Thin entry: parse args (`--port=<n>`, `--probe`, `--model=<provider/id[:thinking]>` pi-session passthrough) → start the daemon (foreground until SIGINT; banner: panel URL, `.remote/token` location, `tailscale serve` setup, ntfy guidance) or run the probe → report → exit. |
  | `clean.ts` | Remove `dist/` + `.build-cache/` per package. `bun clean [package]` scopes to one workspace. |
  | `release.ts` | Update `@hellajs/core` peer deps + `babel-plugin-hellajs` deps across packages, commit (`--no-verify`), then `changeset publish`. Run via `bun release` (the npm script bundles first). |
  | `type-visibility.ts` | Guard (`bun visibility`): fail if any `lib/types*.d.ts` that is wholesale re-exported (`export type * from "./types[…]"`) contains `@internal`-tagged types — those would leak as public. No package scoping; scans every package. |
  | `dead-exports.ts` | Guard (`bun dead-exports`): fail if any exported `function`/`const`/`let`/`class` across packages and plugins has zero value-position references across all source, tests, and docs. No package scoping; type-only exports out of scope. |
  | `jsdoc-params.ts` | Guard (`bun jsdoc-params`): fail if any `function` declaration's JSDoc carries a `@param` tag whose name does not match an actual parameter (catches the `@param boundaryElement` vs `currentBoundary` drift that `tsc`/`eslint` miss). No package scoping; arrow-function `const`s, class methods, and destructuring params out of scope (conservative skip). |
  | `doc-structure.ts` | Guard (`bun lint:structure`), six checks: fence parity (every mdx in packages/docs, examples' `tutorial.mdx`, `docs/src/pages` has an even top-level fence count), tutorial Complete-Code parity (`### src/...` blocks byte-match the real files; undocumented real files flagged; `vite-env.d.ts` exempt; single-file apps — no src headings, exactly one src file — fall back to the Complete-Code section's lone fence, which must byte-match that file), anchor resolution (site `#`-fragments resolve against the target page's heading-derived slugs — thin wrappers contribute their imported package docs' headings, one alias hop), wrapper validity (frontmatter `title`/`description`/`layout` everywhere; import-rendering wrappers carry only imports, component tags, and `border-t` dividers; site-authored content pages and `index.mdx` enumeration pages exempt), nav/index registration (every learn/reference/plugins page appears in `docs/src/nav.ts` and every nav entry has a page; learn content pages also appear in `learn/index.mdx` / `learn/patterns/index.mdx`), example conventions (user-facing mdx only: `children??: unknown` prop types banned, `<summary>Internal Mechanics</summary>` details blocks banned, `<span>⚠️</span>`/`<span>ℹ️</span>` alert icon spans banned, `> ⚠️` blockquote markers banned, function-wrapped `class`/`style`/`title`/`href`/`id` attributes inside jsx/tsx fences banned, single-line `css()`/`style()` object arguments banned — multiline required; the JSX-only-syntax rule stays audit-enforced — the html-method boundary is judgment). |
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

  ## Shared agent-driving concern (`scripts/agent/`, one concern per file)

  The pi-instance driving machinery shared by the plans and merge runners — a shared cross-pipeline concern (`guides/scripts.md` §Canonical paths): no CLI entry, consumed via direct imports.

  | File | Concern |
  |---|---|
  | `agent/rpc.ts` | pi RPC client: spawn, strict JSONL, command/event dispatch, dialog registry, `waitForSettled`, dispose |
  | `agent/relay.ts` | `Relay` interface (the dialog-surface contract) + `TerminalRelay`: terminal dialog rendering + answering, steer routing (`.stop` = abort), orchestrator prompts; owns the process-wide stdin singleton |
| `agent/web-relay.ts` | `WebRelay` (dials `HELLAJS_REMOTE` with `HELLAJS_REMOTE_TOKEN`; dialogs as structured frames answered via routed `dialog-answer`; no-op degradation on connection failure — logs once, stays silent) |
  | `agent/stream.ts` | Terminal stream view: text deltas verbatim, tool one-liners with args, live partial output diffing |
  | `agent/driver.ts` | One-instance driving: `driveAgent` (spawn → prompt → settle → report), `dialogHook`, `makeRelay` (terminal relay always; `HELLAJS_REMOTE` set → `FanOutRelay`, the first-answer-wins composition — both surfaces render, first resolution wins, the loser's answer is discarded, a terminal win dismisses the web card), idempotent `installSigint`, active-instance probe |
  | `agent/worktree.ts` | `worktree.mjs` invocation (`worktreeScript`) + `WT_ROOT` — the protocol entry both runners share |

  ## Plans runner pipeline (`scripts/plans/`, one concern per file)

  Entry `plans.ts` → `set.ts` (list `NN-*.md` units in filename order, read top markers, parse `depends_on` frontmatter, partition into dependency-connected components, `setSlug` + `resolveSetFolder` — read-only; the worker skill owns every tick) → `run.ts` (per-unit orchestration over worktree venues, driving instances through the shared `../agent/` concern: `/skill:worker` prompt naming the target slug, settle → `get_last_assistant_text` report → worktree-copy marker check, auto-continue on tick progress / retry-deliver-abandon-halt gate when stalled, end-of-run outstanding-worktree listing (user-run `bun merge`), SIGINT abort-and-exit-1, final summary with session names). The runner never writes plan files and never starts the next unit after SIGINT or halt. Instances keep `cwd` = main tree (skills and AGENTS.md must resolve from the working tree); all worktree paths are named absolutely in the prompts. `worktree.mjs` invocations stay read-only (`list`/`status`) plus `clean` on explicit abandon.

  | File | Concern |
  |---|---|
  | `plans.ts` | Thin entry: args → validate set → run → report → exit |
  | `plans/set.ts` | Plan-set listing (`NN-*.md`, filename order), top-marker reads, `depends_on` parsing + component partition, `setSlug` + `resolveSetFolder`; read-only |
  | `plans/run.ts` | Per-unit orchestration over worktree venues: fresh instance (shared driver), worktree-copy marker gate, failure gate, end-of-run outstanding listing, summary |

  ## Merge runner pipeline (`scripts/merge/`, one concern per file)

  Entry `merge.ts` → `queue.ts` (mechanical queue derivation: parse `worktree.mjs list`, match protocol slugs back to plan components — `<setSlug>` = whole set, `<setSlug>-<first-unit-stem>` = one dependency-connected component — skip main-tree-merged components, ascending-first-unit order, completeness pre-check against worktree copies) → `run.ts` (per-component orchestration via the shared `../agent/` concern: `/skill:merge` prompt naming the component; success = worktree cleaned AND main-tree ticks; auto-continue on partial progress / retry-skip-halt gate when stalled; set `index.md` top-marker flip after the last merge; union gate run directly (`bun coverage <pkg>` from the set's scope or its runtime-delta packages, `bun lint` fallback; plugin exception) with one fix instance per red round; summary + exit code). The runner commits nothing itself — the instances do, via `worktree.mjs commit` + `git cherry-pick` under the merge skill's contract; refused (incomplete) components keep their worktrees standing.

  | File | Concern |
  |---|---|
  | `merge.ts` | Thin entry: args → validate set → run merge → report → exit |
  | `merge/queue.ts` | Worktree-inventory parsing + queue derivation (slug → component matching, merged-state skip, ordering) + completeness/tick reads |
  | `merge/gate.ts` | Union gate: command derivation (package scope → coverage; non-package scope → runtime-delta packages parsed from unit Files, `bun lint` when none; plugin exception), terminal-passthrough run, fix instance + operator gate on red |
  | `merge/run.ts` | Per-component instance loop, operator gates, set-aggregate flip, summary |

  ## Audits runner pipeline (`scripts/audits/`, one concern per file)

Entry `audits.ts` → `run.ts` (section derivation from the package dir, set-dir naming `plans/<pkg>/audit/<section>/` with colliding suffixes, per-section instance loop over the shared `../agent/` concern: `/skill:audit-<section>` prompt → settle → `NN-*.md` presence check in the set dir → operator gate retry / accept-clean / skip / halt when neither a findings set nor a clean statement materialized; dry-run mode; per-section summary + the `bun plans <set>` invocation per findings set; SIGINT abort-and-exit-1). No worktree machinery — audit is read-only assessment plus plan authoring in the main tree; instances keep `cwd` = main tree and the runner passes absolute set-dir paths in the prompts.

| File | Concern |
|---|---|
| `audits.ts` | Thin entry: args → resolve target → run → report → exit |
| `audits/run.ts` | Section derivation, set-dir naming, per-section instance loop, operator gate, dry-run, summary |

  ## Remote daemon pipeline (`scripts/remote/`, one concern per file)

Entry `remote.ts` → `server.ts` (`Bun.serve` on `127.0.0.1`: panel statics from `remote/panel/`, `GET /api/launchables` JSON behind bearer auth, and the WS endpoint authenticating via the `hello` token frame; token auto-generated `node:crypto` random into `.remote/token` on first start) — phone control of the laptop over the tailnet: supervise runs, structured dialog cards, standalone pi chat sessions, ntfy push. No TLS in-process — the tailnet is the transport; `tailscale serve --bg --tcp=8798 <port>` raw-TCP-forwards (phone opens `http://$(tailscale ip -4):8798`: no DNS, no Host matching; `--bg <port>` HTTPS at the MagicDNS name needs outbound ACME egress, else TLS hangs). State is machine-local and gitignored (`.remote/`: token, `config.json`, `logs/`).

| File | Concern |
|---|---|
| `remote.ts` | Thin entry: args → daemon or probe → report → exit |
| `remote/server.ts` | `Bun.serve` + WS protocol + auth + routes: two client roles (`hello {token, role?, run?}` — panels subscribe to broadcasts, runners dial home), frame dispatch, the dial-home env trio injected per child (`HELLAJS_REMOTE` WS URL + `HELLAJS_REMOTE_TOKEN` + `HELLAJS_REMOTE_RUN` run id), run-exit ntfy push |
| `remote/dialogs.ts` | `DialogRegistry` + the dialog wire types (`DialogFrame`, `DialogPayload`): server-side relabeling of runner `dialog` frames, panel fan-out, first-answer-wins arbitration (panel answers route to the owning runner; a runner's self-addressed id dismisses its card), `dialog-resolved` broadcast, orphan cleanup on runner-socket close, `postDialog`/`probeDialog` daemon-side hooks, gate push on blocking fan-outs |
| `remote/http.ts` | HTTP surface: panel statics (path-traversal guarded) + bearer-token creation (`node:crypto` random into `.remote/token`, mode 0600) |
| `remote/runs.ts` | `RunSupervisor`: raw `Bun.spawn` children (long-lived bidirectional streams — same contract reason as `PiRpc`, not `execCommand`), live-run registry, merged-output tee to `.remote/logs/<id>.log`, `writeStdin`, `kill` (SIGTERM → SIGKILL after 2s); every child's env merges the `childEnv(runId)` dial-home injection (supplied by `server.ts`) |
| `remote/pi-session.ts` | `PiSessionManager`: pi session lifecycle + frame adapters — daemon-owned `PiRpc` children (sessions survive phone disconnects; the daemon's `--model` is the `pi-new` default), `onEvent` → raw `pi-event {sessionId, frame}` broadcasts, `onUiRequest` → the generic blocking `dialog` frame (first answer → `respondUi`), `onUiNotify` → non-blocking `dialog` frames, `waitForSettled` → `pi-settled`, `dispose` (the `PiRpc.dispose` SIGTERM → SIGKILL pattern) → `pi-exited` |
| `remote/launcher.ts` | Curated launchables: plan-set enumeration (reuses `plans/set.ts` listing read-only), presets, custom-command quote-aware argv parse (no shell); concurrency guards (same plan set refused while live — worktree races; merge refused while a merge runs — git-index contention) |
| `remote/notify.ts` | ntfy push: one `fetch` POST to `<ntfyBase>/<topic>` from `.remote/config.json`; body is a fixed template + title only; warn-once no-op when unconfigured; `notifyGate` fires the fixed "gate waiting" push on blocking dialog fan-out (title-only signature — the push-content policy is structural) |
| `remote/probe.ts` | `--probe` full-chain self-test: ephemeral port, temp state dir, real WS client, local HTTP receiver as `ntfyBase`; runner-mode gates (a runtime-written fixture child poses `makeRelay()` dialogs — web-answered select + orchestrator gate, terminal-wins card dismissal, late-answer-discarded); scripted pi chat session (create → prompt → settled → non-empty last text → dispose → exited) over a real `pi` child, skipped with `logger.warn` when `pi` is not on PATH |
| `remote/panel/` | Static vanilla-ES-module panel (`index.html`, `app.js`, `style.css`): token gate, live run feeds + stdin + kill, launcher cards, generic dialog cards, gate cards (blocking dialogs at the top of the run feed with the run id), single-slot status cards, pi chat view (session list + new-session model field, assistant text deltas + tool one-liners mirroring `stream.ts` client-side, prompt/steer/abort controls toggled by `pi-settled`); phone-first single column |

WS frame contract (frame names are the contract):

- Client → server: `hello {token, role?, run?}` (role `"runner"` = daemon-spawned child dialing home; panels default), `start {kind: "plan-set"|"preset"|"custom", ref, argv?}`, `stdin {runId, line}`, `kill {runId}`, `dialog {dialogId, blocking?, title?, message?, options?, placeholder?, prefill?}` (runner-only, runner-local id), `dialog-answer {dialogId, payload}` (panel answer or runner self-dismissal), `runs {}`, and the panel-only pi session frames `pi-new {model?}`, `pi-list {}`, `pi-prompt {sessionId, message}` (awaited server-side; failure → `error`), `pi-steer {sessionId, message}`, `pi-abort {sessionId}`, `pi-last-text {sessionId}`, `pi-dispose {sessionId}`.
- Server → client: `hello-ok`, `started {run}`, `output {runId, chunk}`, `exited {runId, code}`, `runs {runs}`, `dialog {dialogId, run?, blocking?, title?, message?, options?, placeholder?, prefill?}` (server-side id; fanned out to panels), `dialog-answer {dialogId, payload}` (routed to the owning runner, runner-local id), `dialog-resolved {dialogId}`, `pi-sessions {sessions}`, `pi-event {sessionId, frame}` (raw pi event), `pi-settled {sessionId}`, `pi-last-text {sessionId, text}` (response to the request of the same name), `pi-exited {sessionId}`, `error {message}`.

Pi chat: the panel's chat view drives daemon-owned `pi --mode rpc` children (`PiSessionManager`) — prompt → streamed `pi-event` frames (assistant text deltas rendered verbatim, tool events as one-liners mirroring `stream.ts` client-side) → `pi-settled` re-enables the input; steer queues into the active run, abort cancels it, `pi-dispose` ends the session. Approval flow: pi's dialog requests (`select`/`input`/`confirm`/`editor`, tool approvals included) reuse the generic blocking `dialog` frame, so the existing panel gate card answers them — the first answer (phone tap) routes back as the pi `extension_ui_response`; notifies land as non-blocking status cards. Reconnecting panels receive only live frames, not history (v1; replay would belong in `pi-session.ts`).

Runner dial-home: daemon children receive `HELLAJS_REMOTE` + `HELLAJS_REMOTE_TOKEN` (+ `HELLAJS_REMOTE_RUN`) in their env, so `makeRelay()` in `scripts/agent/driver.ts` fans out to `WebRelay` — every dialog and orchestrator gate renders on the phone too. Arbitration is first-answer-wins per dialog: whichever surface (terminal line or panel tap) resolves first wins; the loser's answer is discarded, and a terminal win dismisses the phone card via `dialog-resolved`. `HELLAJS_REMOTE` unset → terminal-only, byte-identical behavior.

## Testing

  Scripts have no dedicated tests. Each entry guards execution with `if (import.meta.main)`, so importing a script (e.g. from a test) does not run it. Coverage instruments `dist/` (the package bundles), not the scripts — script correctness is validated by `bun bundle` exiting 0 in CI.
</scripts-instructions>
