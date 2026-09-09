<hellajs-agent>
  ## Core rules

  - Explore the codebase with tools before proposing changes — treat it as a searchable database.
  - ALWAYS use `bun` for scripts — never `node` directly unless unavoidable.
  - Test and build inside the repo's existing tests, examples, and folders — never wander outside the file system (e.g. `/tmp/`).
  - Load the `prime` skill before any substantive task.
  - **Commits**: the `commit-msg` hook (`.git/hooks/commit-msg`) enforces conventional commits. `feat` (minor) and `fix` (patch) are reserved for deltas to a published package's user-facing API (`packages/*` runtime, published `plugins/*`); docs, scripts, agent-config, tests, and tooling use `docs`/`chore`/`refactor`/`test` no matter how novel. Breaking API changes add `!` + a `BREAKING CHANGE:` footer (major). Releases are user-handled end to end: never publish.
  - **Never create a changeset.** `.changeset/*.md` files and `bun changeset` are user-only, exactly like commits — even for published-package behavior changes. Note the need in the handoff summary; never list changeset creation in a plan's DoD.
  - **DoD discipline** — every pass criterion is a runnable check, never a predicted result. The five-trap list (unverified characterizations, unprobed type premises, tiered-tool scoping, sweep-DoD self-matching) is owned by the `plan` skill, Phase 3.

  ## Non-negotiables

  Two rules govern every task absolutely; ~100% uniform style, accuracy, and feel across every package survives only if both hold on every change. Each skill's `SKILL.md` carries them too, with skill-specific enforcement.

  - **Guides are inviolable.** Source, tests, and docs follow the matching guide (`guides/code.md`, `guides/tests.md`, `guides/docs.md`). A conflict is never silently worked around — surface a **guide-update proposal** (guide + rule quoted + conflict + proposed edit with reasoning). User-directed changes pre-accept their guide updates: derive the edit, apply it uncommitted in the same pass, report it; agent-initiated conflicts wait for the user to accept, reject, or defer. Silent deviation is how uniformity dies.
  - **Every change carries its full blast radius.** Before finishing, account for every downstream effect: sibling tests asserting the old behavior; sibling docs describing the old shape; the touched package's `AGENTS.md` file map (`file.ts symbol` anchors, never line numbers — line citations rot on refactor); its `{pkg}-comparison.md` when a `lib/` change alters any behavior it describes (snapshots drift silently — re-verify every claim, fix drift); grep-blind typed-surface mirrors (`packages/dom`'s `lib/types/nodes.d.ts` + `lib/types/attributes.d.ts` mirror one contract with no import edge — widen both or neither); cross-package consumers of a changed signature; backward compatibility. Green in its own checks but breaking a caller, test, or doc elsewhere = not done.

  ## Packages

  Workspaces under `packages/` — each ships two reads: its `AGENTS.md` (agent-facing internals, gotchas, performance; read it before working in the package) and its `docs/` (the user-facing public contract). When judging whether an interface or behavior misleads users, read the matching `docs/*.mdx` — `AGENTS.md` is not the public contract, and accurate user docs mitigate a "Mislead" finding.

  | Package | Responsibility |
  |---|---|
  | core | Reactive primitives over a doubly-linked dependency DAG: signals = sources, computed = transforms, effects = sinks. Glitch-free, topological propagation. |
  | dom | Surgical DOM updates (no VDOM): scoped MutationObserver cleanup, capture-phase event delegation, keyed list reconciliation (LIS), portals, lazy/async components, transitions, reactive refs, error boundaries, `hydrate()`. |
  | css | Type-safe CSS-in-JS: `css()` + scoped `style()` (content-hashed class), `cssText()` SSR collector, text-keyed refcounting, reactive `vars()`, `cva()` recipes, `cx()`. |
  | resource | Reactive async fetching: fetcher-scoped cache (LRU + TTL), dedup, SWR, abort control, optimistic mutations, polling/retry. |
  | router | Reactive routing: nested routes, parameter inheritance, lifecycle hooks, History API. Resolution: redirects → nested → flat → notFound. |
  | store | Deeply reactive state: plain objects auto-convert to granular signals/stores with TS inference; `$snapshot` / `$update` / `$cleanup` / `$subscribe`. |
  | ssr | Pure HTML stringifier: HellaNode AST → HTML, zero runtime imports (mirrors dom's `renderProp` rules). `resource` no-ops on the server. |

  ## Plugins

  Workspaces under `plugins/` — build-time transforms. `babel` and `astro` have their own `AGENTS.md` and tests; `vite`/`rollup` are thin wrappers.

  | Plugin | Responsibility |
  |---|---|
  | babel | Core compile-time transform: JSX + `html` templates → HellaNode. Attribute prefixes (`on:` / `e:` / `hook:` / `error:`), component detection + `component(...)` wrapping. |
  | rollup | Thin Rollup wrapper around the babel plugin (`index.mjs`). |
  | vite | Thin Vite wrapper around the babel plugin (`index.mjs`). |
  | astro | Astro 7 renderer: `addRenderer` + `vite-plugin-hellajs` wiring, server `renderToStaticMarkup` → `ssr`, client → `hydrate`, slot passthrough via `raw()`. Exclusive-use. Own `AGENTS.md` + tests. |

  ## Scripts

  Invoke as `bun <name> [package]`; the `[package]` arg scopes `bundle`, `clean`, and `coverage` to one workspace. Test-gate semantics and triage protocol: `guides/tests.md` §Triage & Gate Semantics.

  | Name | Command | What it does |
  |---|---|---|
  | coverage | `bun coverage [package]` | bundle + `test --coverage` + lint. With `[package]`: tests + eslint scoped, tsc + guards stay repo-wide, coverage table filtered. CI runs this unscoped. The single verification gate. |
  | bench | `bun bench [--variant=html\|jsx\|ts] [--runs] [--throttle] [--label] [--ops] [--headed]` | Playwright + system Chrome macro-benchmark over `examples/bench`: all 8 krausest ops, appends self-describing entries to `.bench/results.md`. A/B is manual (`git checkout` both refs, compare log). Rebuilds all packages first; requires local Chrome. |
  | plans | `bun plans <set-folder> [--wt=single\|split] [--model=…]` | Fresh `pi --mode rpc` instance per unticked plan unit, executing inside component worktrees (`--wt=split`: one per dependency-connected component). Never merges — completed components stand for `bun merge <set>`, the single human checkpoint. Ticks are read from worktree copies; main-tree copies stay `[ ]` until merge (success, not failure). Gates: retry / deliver-incomplete / abandon / halt. Worktree mechanics: `worker` skill. |
  | bundle | `bun bundle [package]` | Build `dist/` bundles. |
  | lint | `bun lint` | `tsc -p tsconfig.lint.json --noEmit` + `eslint .` + `bun lint:guards`. |
  | lint:guards | `bun lint:guards` | The six guards composed (below); standalone to skip tsc/eslint. |
  | clean | `bun clean [package]` | Remove build artifacts. |
  | changeset | `bun changeset` | Add a changeset entry (user-only — §Core rules). |
  | release | `bun release` | Bundle, then publish via changesets (user-only). |
  | visibility | `bun visibility` | Guard: fail if a wholesale-exported `types*.d.ts` contains `@internal`-tagged types (would leak public). |
  | dead-exports | `bun dead-exports` | Guard: fail if any exported symbol has zero value-position references across source, tests, docs. |
  | jsdoc-params | `bun jsdoc-params` | Guard: fail if a `function` declaration's JSDoc `@param` name matches no parameter. |
  | lint:structure | `bun lint:structure` | Guard (`scripts/doc-structure.ts`), six docs-structure checks: fence parity, tutorial Complete-Code parity, site anchor resolution, wrapper validity, nav/index registration, example conventions (children-unknown prop types, Internal Mechanics details blocks, alert icon spans, blockquote warning markers, function-wrapped jsx/tsx attributes, single-line css/style object arguments). |
  | merge | `bun merge <set-folder> [--model=…] [--dry-run]` | Fresh instance per outstanding component worktree, executing the `merge` skill contract: mechanical queue derivation, completeness pre-check, per-component progress gate, orchestrator-owned index flip + union gate (`bun coverage <pkg>`; plugin exception), one fix instance per red round. `--dry-run` prints the queue. The single human checkpoint. |
  | audits | `bun audits <package> [--section=code\|tests\|docs] [--model=…] [--dry-run]` | Fresh instance per package section (fixed code → tests → docs order), each running the matching `audit-*` skill then authoring its own findings plan set under `plans/<pkg>/audit/<stamp>-<section>/` (three separate sets, executable via `bun plans`). Findings set present → next section; neither a set nor a clean statement → operator gate (retry / accept-clean / skip / halt). Accepts `core` or `packages/core`. `--dry-run` prints derived sections + set dirs without spawning. |
  | doc-snippets | `bun doc-snippets` | Audit tool (NOT a guard, `scripts/doc-snippets.ts`): typechecks every package-doc code block; strict tier gates the exit code, tutorials report informationally. Emits into gitignored `.doc-snippets/`. |
  | doc-links | `bun doc-links` | Guard: fail if a doc link's display name is not a barrel export of its target package (rename drift), or an internal site URL matches no `.mdx` under `docs/src/pages/` (link rot). |
  | em-dash | `bun em-dash` | Guard (`scripts/em-dash.ts`): fail if a user-facing file contains an em/en dash or HTML entity, fences included. Allowlist-include scan (READMEs, package docs, comparisons, tutorials, docs-site pages, changesets); agent-only files exempt. Rewrites: `guides/docs.md` §Typography. |

  ## Skills

  Fourteen first-party skills: a behavioural backbone, a discovery→plan→worker→feedback→memory loop, and the meta skills maintaining it. Edit them directly via `skill` (anatomy) and `author` (voice + cross-reference sync); `feedback` proposals may target skills as well as `AGENTS.md`. No global-inherited layer, no graceful-degradation fallback. `prime` loads first on any substantive task; the rest are discovered on demand.

  The loop: `idea` / `audit-*` / `feature` (entry) → `plan` → `worker` (back to `plan` on a gap, `idea` on a fork) → `feedback` → `memory`. A guide conflict emits a guide-update proposal (§Non-negotiables). A codebase-fact drift — AGENTS.md prose describing behavior the source has outgrown (file maps, invariant one-liners) — is not a rule conflict: route it to `plan` as a factual fix in the change's blast radius. A Break-severity finding from any entry skill carries an empirical repro (a failing command/test) or a source-read enumeration of every path realizing it — a narrated scenario is not evidence; `plan` refuses to pin a DoD test to an unverified Break.

  | Skill | Role |
  |---|---|
  | `prime` | Operating backbone: the loop, handoff gate, layering contract, memory protocol. Loaded first. |
  | `idea` | Stress-test an idea/plan; resolve load-bearing forks. Entry. |
  | `audit-code` | Grade `lib/` source + config against `guides/code.md` plus cost-gated judgment critique (smells, API design); in-contract findings → worker redo, scope-expanding → `plan`. Entry. |
  | `audit-tests` | Grade `*.test.ts` against `guides/tests.md` (structure, anti-patterns, gate semantics); same routing. Entry. |
  | `audit-docs` | Grade package md/mdx against `guides/docs.md` + package AGENTS.md file-map drift; same routing. Entry. |
  | `audit-scripts` | Grade `scripts/**`/`utils/**` against `guides/scripts.md` + scripts/AGENTS.md drift; separate from package audit runs. Entry. |
  | `feature` | Surface grounded enhancement ideas; hand to `plan` as evidence maps. Entry. |
  | `plan` | Turn a goal or evidence map into a task-contract (Files, delta, DoD). |
  | `worker` | Execute a plan task-by-task, ticking each DoD with cited evidence; plan-file runs execute in worktrees and end delivered for merge. |
  | `merge` | Per-component worktree merge as one conventional commit; executed by `bun merge`. |
  | `feedback` | After a run with friction, conservatively apply config/skill edits, uncommitted. |
  | `memory` | Persist verified decisions/facts to `memory/`; refresh/supersede. |
  | `skill` | Author/revise skills. Standalone. |
  | `author` | Author/revise `AGENTS.md`, agent prompts, rules files. Standalone. |

  Plus one standalone project skill outside the pack: `comparison` (`.agents/skills/comparison/`) — generate a package comparison doc vs competitors.

  ## Response protocol

  After any substantive work (skill used, files edited, commands run, decision made), state a one-sentence handoff gate: name the skill the work hands off to and justify in one clause. Any skill can be the right target — decide critically, not reflexively. Full gate detail and self-checks: `prime`. Mandatory — silently skipping the gate equals skipping a verification step.

  | Condition | Action |
  |---|---|
  | Worker completes a plan unit | Completion pipeline fires the matching `audit-*` skill (Code → `audit-code` — judgment lenses included when the unit changed a public surface, Tests → `audit-tests`, Docs → `audit-docs`, scripts/config → `audit-scripts`) → redo (in-contract, one) → `feedback` → `memory` on events |
  | Loop completed with friction | `feedback` (applies via `author`/`skill`, uncommitted) |
  | Non-obvious decision, not already durable | `memory` |
  | Actionable change surfaced (bug, gap, needed edit) | `plan` |
  | Multiple | Each, labeled and justified |
  | None (trivial, clean run, mid-loop) | Say "nothing to hand off" and finish |

  ## Style guides

  Read the matching guide before editing — each is a decision procedure (trees + canonical paths/examples at top, rules in the middle, verification checklist at the end); read the relevant section, not the whole file. A rule edit syncs the checklist item that audits it in the same pass — the matching `audit-*` skill ticks the checklist, not the prose.

  | Trigger | Guide |
  |---|---|
  | Writing/editing source, types, JSDoc, imports, package structure | `guides/code.md` |
  | Writing tests or assertions | `guides/tests.md` |
  | Writing docs, `.mdx`, or examples | `guides/docs.md` |
  | Writing build scripts (`scripts/**`, `utils/**`) | `guides/scripts.md` |

  Config files (`tsconfig*`, `eslint.config.*`, `package.json`, build plugins) follow `guides/code.md` plus its Config verification checklist. A file is verified against the guide matching its *own* extension, not the task's Type tag — a `*.test.ts` against `tests.md`, `.md`/`.mdx` against `docs.md`, `*.ts`/`*.tsx`/`*.mjs` under `lib/`/`scripts/`/`plugins/` against `code.md`.

  ## Folder structure

  - `.agents/skills/` — the twelve first-party skills + `comparison/` (standalone).
  - `../hellajs-wt/` — per-component worktrees (`wt/<slug>` branches), protocol-owned: seeded by `worker`'s `worktree.mjs`, merged back only by `bun merge`.
  - `.changeset/` — changeset config.
  - `.github/` — workflows (CI + release).
  - `docs/` — Astro docs site, importing package docs from `packages/*/docs/`. **A Docs task spans the full site surface**: `learn/concepts/` + `learn/patterns/` + `learn/tutorials/` wrapper pages, `reference/{pkg}/` API wrappers, `nav.ts` registration, and the enumeration indexes. A user-facing feature needs: a concept doc, a pattern doc when copy-paste recipes apply, `nav.ts` registration, and every enumeration listing it updated. Before scoping a Docs task, grep the site for prose claims the change falsifies (e.g. an "X not supported" alert).
  - `examples/` — `bench`, `blog`, `counter`, `theme-switcher`, `todo`, `ssr-islands`, `ssr-routing`, `ssr-streaming`, `astro-islands`. All except `bench` carry `tutorial.mdx` next to the code (`guides/docs.md` §Tutorial Docs).
  - `guides/` — style guides (§Style guides).
  - `memory/` — knowledge base: `entries/*.md` canonical, `index.md` derived (`memory.ts rebuild`; never hand-edited), `archive/` retired. `memory` is the single writer.
  - `packages/` — the seven workspaces.
  - `plans/` — agent-generated plan contracts at `plans/<package>/<category>/<topic>/`. Files-list derivations: rename/removal plans → repo-wide `rg '<old-name>'` (comparison docs, READMEs, tutorials, nav — prose enumeration misses them); behavior-contract changes → repo-wide `rg` of the claim sentence falsified; sweep-DoD plans → the DoD's own `rg` pattern's match set. Comparison-delta competitor cells cite the competitor source per cell or route through `comparison` (workers lack web access). A unit's delta describes the state after that unit, never a later unit's end-state.
  - `plugins/` — `babel`, `rollup`, `vite`, `astro`.
  - `scripts/` — build/CI automation + `utils/` + `bundle/` pipeline; see `scripts/AGENTS.md` and `guides/scripts.md`.
  - `utils/` — `happydom.js` (test preload).
  - `AGENTS.md` — source of truth (this file).

  ### Package layout

  | File/Folder | Purpose |
  |---|---|
  | `package.json` | Package metadata |
  | `lib/` | Source — primary truth |
  | `tests/` | Test suite |
  | `docs/` | Documentation (`api/`, `concepts/`, `patterns/`, `index.mdx`) |
  | `dist/` | Built bundles — what coverage instruments and what ships |
  | `AGENTS.md` | Agent instructions |
  | `README.md` | Package readme |
  | `tsconfig.json` | TypeScript config |
  | `CHANGELOG.md` | Changelog |
  | `{pkg}-comparison.md` | Comparison guide |
  | `LICENSE` | MIT — byte-identical root copy (sole exception: `core` appends alien-signals attribution — do not normalize); plugins ship the root copy too (npm auto-includes it). |

  ## Testing

  Tests run under HappyDOM via preload (`utils/happydom.js`, in `bunfig.toml`); conventions (framework, imports, structure, anti-patterns, the checklist): `guides/tests.md`. Gate semantics and triage protocol (scoped runs, foreign failures, plugin exception, blind spots, measurement target): `guides/tests.md` §Triage & Gate Semantics.

  **NEVER verify with bare `bun test`** — `packages/` tests import `dist/` bundles and `bun test` never rebuilds them (silently stale). The single verification gate is `bun coverage <package>`. Mid-flight iteration only: `bun bundle <package> --quiet && bun test packages/<package>/tests[/<file>.test.ts]`. Never list standalone `bun lint` or `bun test` in a plan's DoD when `bun coverage` is present. `bun coverage` enforces neither the guides' structural rules nor their anti-patterns — a new file, file structure, or shared test helper gets the matching `audit-*` skill run as part of verification.

  Plan-file worker runs execute in a component worktree (`../hellajs-wt/<slug>/`, seeded by `worker`'s `worktree.mjs`): bundle/coverage run inside the worktree; merge-back lands via `bun merge`. Inline plans and foreign-failure triage are unchanged.
</hellajs-agent>
