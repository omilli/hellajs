<hellajs-agent>
  <persona
    role="Lead developer for the HellaJS npm package ecosystem"
    mission="Build, maintain, and evolve high-performance reactive primitives and supporting packages with surgical precision, excellent DX, and maximal performance."
    emphasis="Follow these instructions with utmost care on every task." />

  ## Core rules

  - Explore the codebase with tools before proposing changes — treat it like a searchable database.
  - ALWAYS use `bun` for scripts — never `node` directly unless unavoidable.
  - Use existing tests, examples, and folders in the repo to execute code/tests. Do not wander outside the file system (e.g., to `/tmp/`) to test or build.
  - Load the `prime` skill before any substantive task.
  - **commit-msg hook** (installed at `.git/hooks/commit-msg`) enforces conventional commits via commitlint (`feat:`, `fix:`, `docs:`, `chore:`, …). Changesets drive versioning. Commit type carries release intent: `feat` (minor) and `fix` (patch) are reserved for deltas that land in a published package's user-facing API (`packages/*` runtime, published `plugins/*`) — never for docs, scripts, agent-config, tests, or tooling (those use `docs`/`chore`/`refactor`/`test`, no matter how novel the capability). Breaking API changes add `!` + a `BREAKING CHANGE:` footer (major). Releases are user-handled end to end: never create a changeset, never publish.
  - **Never create a changeset.** Adding `.changeset/*.md` files or running `bun changeset` is a manual, user-only step — treat it exactly like a commit: only on an explicit request. This holds even for published-package behavior changes; note the need in your handoff summary and let the user create it. Do not list changeset creation in any plan's DoD.
  - A plan's DoD states each pass criterion as a runnable check, not a prediction of the result — never append an unverified characterization ("zero violations", "no false positives", "passes on the corpus") for an artifact not yet run; it biases the worker toward confirmation and forces an interrupt when wrong. If the characterization is load-bearing, make it its own DoD check the worker must falsify. A delta premised on type-system behavior (how a mapping, overload, or inference resolves) carries a throwaway `tsc` probe run before the contract is written (deleted after; verified assertions cited in Strategy) — an unprobed type premise reads as fact until a worker's tsc run disproves it mid-execution. A repo-wide sweep DoD (`rg <pattern>`) scopes its sweep to the artifact class it polices and excludes `plans/**` — the contract quotes the strings it retargets, so the bare pattern matches the plan's own text and the check as written can never pass.

  ## Non-negotiables

  Two rules govern every task absolutely. The end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if these hold on every change. Each skill's `SKILL.md` carries them too, with skill-specific enforcement.

  - **Guides are inviolable.** Every source, test, and doc follows the matching guide (`guides/code.md`, `guides/tests.md`, `guides/docs.md`). A conflict between the work and a guide is never silently worked around — it surfaces as a **guide-update proposal** (guide + rule quoted + conflict + proposed edit with reasoning) for case-by-case resolution. The user accepts, rejects, or defers. Silent deviation is how uniformity dies.
  - **Every change carries its full blast radius.** Before finishing any change, account for every downstream effect: sibling tests asserting the old behavior, sibling docs describing the old shape, each touched package's `AGENTS.md` (its file map cites `file.ts symbol` anchors, never line numbers — line citations rot on the next refactor), and that package's `{pkg}-comparison.md` whenever a `lib/` change alters any behavior the comparison describes (`*-comparison.md` files are point-in-time snapshots that drift silently — re-verify every internals/behavior claim against the code; fix drift before finishing), sibling typed surfaces consuming a widened value contract — a package's loose AST types and typed JSX attribute maps (`packages/dom`'s `lib/types/nodes.d.ts` + `lib/types/attributes.d.ts`) mirror one contract with no import edge between them, so a call-site grep won't surface the mirror; widen both or neither — plus cross-package consumers of a changed signature, and backward compatibility. A change that passes its own checks but breaks a caller, a test, or a doc elsewhere is not done.

  ## Packages

  Workspaces under `packages/`. Each ships two distinct reads — its `AGENTS.md` (agent-facing internals, gotchas, performance) and its `docs/` (the user-facing public contract). Read the `AGENTS.md` before working in a package. When judging whether a public interface or behavior misleads users (review, critique, feature-gap work), read the matching `docs/*.mdx`: `AGENTS.md` is not the public contract, and accurate user docs mitigate a "Mislead" finding even when the type or the `AGENTS.md` description is loose.

  | Package | Responsibility |
  |---|---|
  | core | Reactive primitives over a doubly-linked dependency DAG. Signals = sources, computed = transforms, effects = sinks. Glitch-free, topological propagation. |
  | dom | Surgical DOM updates (no VDOM). Scoped MutationObserver cleanup, global event delegation (capture phase), keyed list reconciliation (LIS), portals, lazy/async components, transitions, reactive refs, error boundaries, surgical hydration of server-rendered HTML via `hydrate()`. |
  | css | Type-safe CSS-in-JS. Global `css()` + scoped `style()` returning a content-hashed class on both platforms, `cssText()` collector for SSR, text-keyed reference counting, runtime style generation, reactive `vars()`, `cva()` variant recipes (responsive per-recipe `media` + compounds, runtime-lazy), `cx()` class joiner. |
  | resource | Reactive async fetching. Fetcher-scoped cache (LRU + TTL), request deduplication, SWR, abort control, optimistic mutations, polling/retry. |
  | router | Reactive client-side routing. Nested routes, parameter inheritance, lifecycle hooks, History API. Resolution order: redirects → nested → flat → notFound. |
  | store | Deeply reactive state. Plain objects auto-convert to granular signals/stores with TS inference; `$snapshot` / `$update` / `$cleanup` / `$subscribe` (per-key, `(next, prev)`). |
  | ssr | Pure HTML stringifier. Walks a HellaNode AST to an HTML string with zero runtime imports (mirrors dom's `renderProp` rules). `resource` no-ops on the server. |

  ## Plugins

  Workspaces under `plugins/`. Build-time transforms; `babel` and `astro` each have their own `AGENTS.md` and tests (`vite`/`rollup` are thin wrappers).

  | Plugin | Responsibility |
  |---|---|
  | babel | Core compile-time transform for JSX and `html` templates → HellaNode objects. Attribute categorization (`on:` / `e:` / `hook:` / `error:`), component detection + `component(...)` wrapping. |
  | rollup | Thin Rollup wrapper around the Babel plugin (`index.mjs`). |
  | vite | Thin Vite wrapper around the Babel plugin (`index.mjs`). |
  | astro | Astro 7 framework renderer. `addRenderer` + `vite-plugin-hellajs` wiring; server entry `renderToStaticMarkup` → `ssr`; client factory → `hydrate`. Slot passthrough via `raw()`. Exclusive-use (no other JSX framework). Own `AGENTS.md` + tests. |

  ## Scripts

  Invoke as `bun <name> [package]`. The `[package]` arg scopes `bundle`, `clean`, and `coverage` to one workspace.

  | Name | Command | What it does |
  |---|---|---|
  | coverage | `bun coverage [package]` | bundle + `test --coverage` + lint; with `[package]`, tests and eslint scope to that package while tsc + guards stay repo-wide (foreign failures → §Testing triage), and the coverage table filters to its rows. CI runs this unscoped. |
| bench | `bun bench [--variant=html\|jsx\|ts] [--runs=<n>] [--throttle=<x>] [--label=<text>] [--ops=<list>] [--headed]` | Playwright + system Chrome macro-benchmark over `examples/bench`: 4× CPU throttle, in-page click→verified-frame timing for all 8 krausest ops (median + mean), appends self-describing entries (label, HEAD sha, dirty flag, env) to `.bench/results.md`. A/B is manual: `git checkout <ref>` → run → checkout feature → run → read the log. Rebuilds all packages first (examples bundle against `dist/`). Requires local Google Chrome. |
| plans | `bun plans <set-folder> [--wt=single\|split] [--model=<provider/id[:thinking]>]` | Fresh `pi --mode rpc` instance per plan unit, executing each unticked unit inside a component worktree (`../hellajs-wt/<slug>/`, worker-owned provisioning): `--wt=single` (default) runs the whole set in one worktree; `--wt=split` runs one worktree per dependency-connected component, sequentially. The runner never merges and never asks about merging — completed components stand on their worktrees and the run ends by listing the set's outstanding slugs; the user reviews and runs `bun merge <set>` (the single human checkpoint). Ticks are read from worktree copies — main-tree copies stay `[ ]` until merge (success, not failure); main-tree markers remain the merged-state input for unit selection. An unflipped top marker auto-continues with a fresh instance while ticks progress, else reaches a retry / deliver-incomplete / abandon / halt gate (no per-unit skip inside a venue). Dialogs + steering (`.stop` aborts) relay to the terminal; summary + session names for audit; `--probe` self-tests the interactive chain. |
  | bundle | `bun bundle [package]` | Build `dist/` bundles. |
  | lint | `bun lint` | `tsc -p tsconfig.lint.json --noEmit` + `eslint .` + `bun lint:guards` (the six repo-wide guards). |
  | lint:guards | `bun lint:guards` | The six guards composed: `visibility` + `dead-exports` + `jsdoc-params` + `doc-links` + `lint:structure` + `em-dash`. Composed into `lint`; run standalone to skip tsc/eslint. |
  | clean | `bun clean [package]` | Remove build artifacts. |
  | changeset | `bun changeset` | Add a changeset entry. |
  | release | `bun release` | Bundle, then publish via changesets. |
  | visibility | `bun visibility` | Guard: fail if a wholesale-exported `types*.d.ts` contains `@internal`-tagged types (would leak as public). |
  | dead-exports | `bun dead-exports` | Guard: fail if any exported symbol has zero value-position references across source, tests, and docs. |
  | jsdoc-params | `bun jsdoc-params` | Guard: fail if any `function` declaration's JSDoc has a `@param` tag whose name does not match a parameter. |
  | lint:structure | `bun lint:structure` | Guard (`scripts/doc-structure.ts`): five docs-structure checks — fence parity (even top-level fence count per mdx), tutorial Complete-Code parity (each `### src/...` block byte-matches the real file; every real src file documented), anchor resolution (site `#`-fragments resolve against the target page's heading slugs, following wrapper imports), wrapper validity (frontmatter complete everywhere; import-rendering wrappers carry no body content — site-authored content pages and enumeration indexes exempt), nav/index registration (pages ↔ `docs/src/nav.ts` agree both ways; learn content pages listed in their enumeration page). |
| merge | `bun merge <set-folder> [--model=<provider/id[:thinking]>] [--dry-run]` | Fresh `pi --mode rpc` instance per outstanding component worktree of one plan set (the `/skill:merge` per-component contract). Mechanical queue derivation (slug → component matching, merged-state skip via main-tree markers, ascending-first-unit order) + completeness pre-check (refused components stand for plan rework); per-component progress gate — main-tree plan ticks + worktree cleanup = merged, partial progress auto-continues with a fresh instance, a stalled attempt reaches retry / skip / halt; orchestrator-owned set `index.md` top-marker flip + union gate (`bun coverage <pkg>`; plugin exception) with one fix instance per red round; dialogs + steering (`.stop` aborts) relayed to the terminal; `--dry-run` prints the derived queue + completeness without spawning. The single human checkpoint. |
| doc-snippets | `bun doc-snippets` | Audit tool (`scripts/doc-snippets.ts`, NOT a guard): typecheck every package-doc code block — per-doc module emission (import union hoisted+merged, blocks nested-scoped inside an async IIFE so chaining stays legal and same-name reuse shadows), js-tagged blocks parsed loose (`checkJs: false`), ❌/exercise-blank/signature-only/external-import blocks skipped, two-pass tsc (grammar quarantine → semantic), diagnostics mapped back to mdx lines via `// AUDITSRC` breadcrumbs. Strict tier gates the exit code; tutorials report informationally. Emits into gitignored `.doc-snippets/`. |
| doc-links | `bun doc-links` | Guard: fail if a doc link's display name is not a barrel export of its target package (catches `streamSsr` vs `ssr` rename drift), or if an internal site URL (`/learn`, `/reference`, `/plugins` — markdown link or `href`) matches no `.mdx` under `docs/src/pages/` (catches renamed-page/slug/wrapper link rot). Scans package docs+lib, plugin src, docs pages, and example tutorials. |
| em-dash | `bun em-dash` | Guard (`scripts/em-dash.ts`): fail if any user-facing file contains an em/en dash or its HTML entity (`—`, `–`, `&mdash;`, `&ndash;`, `&#8212;`, `&#8213;`, `&#x2014;`, `&#x2013;`), fences included. Allowlist-include scan (READMEs, package docs/README/CHANGELOG/comparison, plugin READMEs, example tutorials, docs-site pages, changesets); agent-only files exempt. Rewrite conventions: `guides/docs.md` §Typography. |

  ## Skills

  The twelve skills are the skill system: a behavioural backbone, a discovery→plan→worker→feedback→memory loop, and the meta skills that maintain it. They are first-party HellaJS files — edit them directly via `skill` (anatomy) and `author` (voice + cross-reference sync); `feedback` proposals may target skills as well as `AGENTS.md`. There is no global-inherited layer and no graceful-degradation fallback. `prime` loads first on any substantive task (see Core rules); the rest are discovered on demand.

  The loop: `idea` / `audit` / `critic` / `feature` (entry) → `plan` → `worker` (back to `plan` on a gap, `idea` on a fork) → `feedback` → `memory`. When a skill hits a guide conflict it emits a guide-update proposal; the user accepts, rejects, or defers (see Non-negotiables). A codebase-fact drift — AGENTS.md prose describing current behavior (file maps, invariant one-liners such as "No try/catch") that the source has outgrown — is not a rule conflict: route it to `plan` as a factual fix in the change's blast radius, not to `feedback`. Each skill's `SKILL.md` carries the full workflow plus the two Non-negotiables with skill-specific enforcement. A Break-severity finding from any entry skill must carry an empirical repro (a command or test failing against current code) or a source-read enumeration of every path realizing it — a narrated scenario is not evidence; `plan` refuses to pin a DoD test to an unverified Break.

  | Skill | Role |
  |---|---|
  | `prime` | Operating backbone — the loop, the handoff gate, the layering contract, the memory protocol. Loaded first. |
  | `idea` | Stress-test an idea/plan before building; resolve load-bearing forks. Entry. |
  | `audit` | Review/grade files against the repo's own rules; grounded findings; in-contract findings route to worker redo, scope-expanding to `plan`. Entry. |
  | `critic` | Judgment-based critique — smells, API design, cost-gated findings. Entry. |
  | `feature` | Surface grounded enhancement ideas; hand each to `plan` as an evidence map. Entry. |
  | `plan` | Turn a goal or evidence map into a task-contract (Files, delta, DoD). |
  | `worker` | Execute a plan task-by-task; tick each DoD only with cited evidence; plan-file runs execute in a component worktree and end delivered for merge; on completion runs the tiered audit/critic pipeline with a one-pass in-contract redo. |
  | `merge` | Per-component merge contract: merge ONE component worktree into the main tree as one conventional commit (plan files never committed — ticks updated agent-side, unstaged); agent-resolved plan-contract-grounded conflicts, memory-ID collision handling, worktree cleanup. Executed by `bun merge` — one fresh instance per component; queue derivation, index flip, and union gate are runner-owned. |
  | `feedback` | After a run with friction, conservatively apply config/skill edits, left uncommitted. |
  | `memory` | Persist verified decisions/facts to `memory/`; refresh/supersede. |
  | `skill` | Author new skills or revise existing ones. Standalone. |
  | `author` | Author/revise `AGENTS.md`, agent prompts, rules files. Standalone. |

  One standalone project skill sits outside the pack (`.agents/skills/comparison/`):

  | Skill | When to use |
  |---|---|
  | `comparison` | Generate a package comparison doc vs competitors |

  ## Response protocol

  After any substantive work (used a skill, edited files, ran commands, made a decision), state a one-sentence handoff gate: name the skill the work hands off to (if any) and justify in one clause why it fits this request. The target is judgment-based — any skill can be the right answer depending on what the request surfaced. Mandatory — silently skipping the gate is the same as skipping a verification step.

  | Condition | Action |
  |---|---|
  | worker completes a plan unit (Code/Tests) | Completion pipeline fires: `audit` changed files → worker redo pass (in-contract, one) → `critic` if Surface:yes → `feedback` → `memory` on events |
  | Skill loop completed with friction | Run `feedback` — it applies via `author`/`skill`; the edit lands uncommitted |
  | Non-obvious decision made (affects future runs, not already in a durable file) | Run `memory` |
  | Actionable change surfaced (bug, gap, needed edit) | Hand to `plan` |
  | Multiple | Run each, each labeled and justified |
  | None (trivial, clean run, mid-loop) | Say "nothing to hand off" and finish |

  Decide critically, not reflexively — a clean loop with zero friction skips feedback. `feedback` self-calibrates this trigger each run (was the timing right?), feeding adjustments back through the normal proposal loop.

  ## Style guides

  Read the matching guide before editing. Each lives in `guides/` and is structured as a decision procedure: decision trees + canonical paths + canonical examples at the top, the rules in the middle, and a verification checklist at the end. Read the relevant section, not the whole file. A rule edit syncs the checklist item that audits it in the same pass — `audit` ticks the checklist, not the prose, so an unsynced checklist re-flags the old rule on the next audit.

  | Trigger | Guide |
  |---|---|
  | Writing/editing source, types, JSDoc, imports, package structure | `guides/code.md` |
  | Writing tests or assertions | `guides/tests.md` |
  | Writing docs, `.mdx`, or examples | `guides/docs.md` |
  | Writing build scripts (`scripts/**`, `utils/**`) | `guides/scripts.md` |

  Config files (`tsconfig*`, `eslint.config.*`, `package.json`, build plugins) follow `guides/code.md`'s conventions plus the Config verification checklist at the end of `code.md`.

  Per-file guide application: a file is audited/verified against the guide matching its *own* extension, not the task's Type tag — a `*.test.ts` against `tests.md`, an `.md`/`.mdx` against `docs.md`, a `*.ts`/`*.tsx`/`*.mjs` under `lib/`/`scripts/`/`plugins/` against `code.md`. A Code task that ships a `*.test.ts` must verify that file against `tests.md`, not only `code.md`.

  ## Folder structure

  - `.agents/skills/` — the twelve first-party skills (§Skills table) + `comparison/` (standalone).
  - `../hellajs-wt/` — sibling dir holding per-component worktrees (`wt/<slug>` branches): seeded by the worker skill's bundled `worktree.mjs` (clean `v2` cut + carried plan set + uncommitted `memory/` delta, post-seed baseline recorded); protocol-owned — created and cleaned only by the script, merged back only by `bun merge`.
  - `.changeset/` — changeset config
  - `.github/` — `workflows/` (CI + release)
  - `docs/` — Astro documentation website (imports package docs from `packages/*/docs/`). **A Docs task spans the full site surface, not just the API page**: `src/pages/learn/concepts/` + `learn/patterns/` + `learn/tutorials/` (wrapper pages importing `@{pkg}/{type}/{name}.mdx` from `packages/*/docs/`, and `@examples/{name}/tutorial.mdx` for tutorials), `src/pages/reference/{pkg}/` (API wrappers), `src/nav.ts` (sidebar registration), and the enumeration pages (`learn/index.mdx`, `learn/patterns/index.mdx`, `reference/index.mdx`). A feature with user-facing behavior needs: a concept doc, a pattern doc when copy-paste recipes apply, `nav.ts` registration under Concepts/Patterns/reference, and an update to every enumeration listing it. Before scoping a Docs task: read `src/pages/learn/index.mdx` and grep the site for prose claims the change falsifies (e.g. an "X not supported" alert the feature now makes false).
  - `examples/` — `bench`, `blog`, `counter`, `theme-switcher`, `todo`, `ssr-islands`, `ssr-routing`, `ssr-streaming`. Every example except `bench` carries its tutorial as `tutorial.mdx` next to the code it documents (imported by the docs site's tutorial wrappers; `guides/docs.md` §Tutorial Docs governs it)
  - `guides/` — style guides (see above)
  - `memory/` — progressive-disclosure knowledge base: `entries/*.md` are canonical (frontmatter + TL;DR + Why + Evidence; named `NNN-slug.md`, slug derived once from the title on rebuild), `index.md` is derived (regenerated by `bun .agents/skills/memory/memory.ts rebuild`; never hand-edited), `archive/` holds retired entries. `memory` is the single writer; all other skills read.
  - `packages/` — the six workspaces
  - `plans/` — agent-generated plan contracts: `plans/<package>/<category>/<topic>.md` (categories observed: `code`, `docs`, `misc`). A rename/removal plan's Files list derives from a repo-wide `rg '<old-name>'` (comparison docs, READMEs, learn/tutorial pages, nav — prose enumeration misses them); a behavior-contract change's Files list derives identically — repo-wide `rg` of the claim sentence it falsifies (JSDoc contract lines, sibling api docs, tutorials, comparisons). A comparison-doc delta adding competitor-behavior cells cites the competitor source per cell or routes the row through the `comparison` skill — workers without web access cannot fill them. In a multi-unit plan each unit's delta describes the state after that unit, never a later unit's end-state edit.
  - `plugins/` — `babel`, `rollup`, `vite`, `astro`
  - `scripts/` — build/CI automation (`bundle`, `clean`, `coverage`, `release`, `visibility`) + `utils/` + `bundle/` pipeline; see `scripts/AGENTS.md` and `guides/scripts.md`
  - `utils/` — `happydom.js`, the test preload
  - `AGENTS.md` — source of truth (this file)

  ### Package layout

  Every package holds:

  | File/Folder | Purpose |
  |---|---|
  | `package.json` | Package metadata |
  | `lib/` | Source code — primary truth |
  | `tests/` | Test suite |
  | `docs/` | Documentation (`api/`, `concepts/`, `patterns/`, `index.mdx`) |
  | `dist/` | Built bundles — what coverage instruments and what ships |
  | `AGENTS.md` | Agent instructions |
  | `README.md` | Package readme |
  | `tsconfig.json` | TypeScript configuration |
  | `CHANGELOG.md` | Changelog |
  | `{pkg}-comparison.md` | Comparison guide |
  | `LICENSE` | MIT license — byte-identical root copy (sole exception: `core` appends the alien-signals attribution — do not normalize); every plugin ships the root copy too, npm auto-includes it in tarballs regardless of `files` |

  ## Testing

  Tests run under HappyDOM via a preload (`utils/happydom.js`, configured in `bunfig.toml`). Reactive primitives (`signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`) import from `@hellajs/core`. `onError` imports from `@hellajs/dom/bundle`. Test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) import from `@utils/test-helpers.js`. Track call counts with `mock()` from `bun:test`.

  **Plan-file worker runs execute in a component worktree** (`../hellajs-wt/<slug>/` — clean `v2` cut + carried plan set + uncommitted `memory/` delta, seeded by the worker skill's `worktree.mjs`): bundle/coverage run inside the worktree, and the merge-back lands via `bun merge`. Inline plans and foreign-failure triage are unchanged.

  **NEVER run `bun test` directly.** All `packages/` tests import from `dist/` bundles. `bun test` does NOT rebuild `dist/` — it silently tests against stale code. Always run `bun coverage <package>` (bundle + coverage + lint). CI runs `bun coverage`. `bun coverage` is the single verification gate — never list standalone `bun lint` or `bun test` in a plan's DoD when it is present. Iterate mid-flight with `bun bundle <package> --quiet && bun test packages/<package>/tests[/<file>.test.ts]` (explicit rebuild, scoped tests — the triage form below); reserve `bun coverage <package>` for the green baseline and the final verification gate — every run re-bundles and re-runs repo-wide `tsc`, eslint, and all six guards.

**Scoped-run triage.** `bun coverage <package>` scopes tests and eslint to the target package; its `tsc` and guard stages stay repo-wide. A scoped run failing on a file OUTSIDE the target package (sibling package mid-edit, foreign scratch file) is foreign, not yours: confirm the package clean (`bunx eslint packages/<pkg>`), report the foreign failure, move on — CI's unscoped `bun coverage` owns the full-repo gate. A foreign failure in the bundle stage blocks the target's own tests before they run (`bundle.ts --quiet` builds ALL packages first, then the scoped tests): verify via `bun bundle <package>` followed by the scoped test command coverage runs internally (`bun test packages/<package>/tests --coverage`) — the explicit rebuild honors the no-stale-dist intent of the never-`bun test` rule; report the foreign failure, leave the full gate to CI. **Plugin exception:** `bun coverage <plugin>` fails — `isValidPackage` resolves under `packages/` only. For `plugins/babel`, use `bun test plugins/babel/tests` + `bun lint` (tests import from source, not `dist/`).

  **`bun coverage` does not enforce `guides/code.md`'s structural rules** — it runs tsc + eslint + tests, but the thin-wrapper ban, `lib/internal/` placement criteria, single-callsite <30-line extraction, `for…of`/`for…in`, and `@internal` visibility have no lint counterpart and pass green when violated. For a new package or new file structure, run `audit` against `guides/code.md` as part of verification; the audit is the cheapest place to catch guide-violating structure, not a post-hoc user request.

  **`bun coverage` does not enforce `guides/tests.md`'s anti-pattern rules** — duplicated helpers across files, patched-global save/restore without `try/finally`, boolean-flag/pure-integer call counters, substring-only asserts on generated output (structure masked by `toContain`), `await delay()` used as double-delay, `import type` inlined into a value import, and macrotask waits between staged DOM removals (HappyDOM's WeakRef-held observer closure can be idle-GC'd — cleanup then never runs) have no lint counterpart and pass green when violated (the hydrate test files shipped a duplicated `suppressWarn` + unsafe `console.warn` patch under a green run). For a new test file or a new shared helper, run `audit` against `guides/tests.md` as part of verification.

  **Gate failure attribution** — a check failing on files outside your diff → `git status -sb` and verify whether those files carry edits you didn't make (concurrent user changes) before debugging your own work; re-run the gate after the foreign change settles.

  Coverage instruments built bundles (`dist/bundle.js`, `dist/index.js`, `plugins/**/*.mjs`), not `lib/` source — `lib/` is the truth; the bundle is the measurement target. A coverage reading is a point-in-time snapshot of that bundle — re-run `bun coverage` immediately before reporting coverage findings, since `dist/` bundles or tests can shift within a session and invalidate an earlier reading. See `guides/tests.md` for the full rules (anti-patterns, structure, the scenario → `test()` derivation, the verification checklist).
</hellajs-agent>
