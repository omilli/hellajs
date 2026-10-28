<hellajs-agent>
  ## Core rules

  - Explore the codebase with tools before proposing changes — treat it as a searchable database.
  - Run scripts with bare `node` (`./scripts/*.ts` executes via strip-types; Node ≥24 pinned by `.node-version`) — never `bun`. Canonical invocation is `vp run <name>` (args forward; `npm run <name> -- [args…]` is the PM-literal form). Exception: the four pi-cluster scripts (`worker`, `merge`, `audits`, `memory`) stay `bun`-launched until the deferred pi work; `@types/bun` stays as a types-only devDep for those scripts' `Bun.*` APIs.
  - Test and build inside the repo's existing tests, examples, and folders — never wander outside the file system (e.g. `/tmp/`).
  - Load the `prime` skill before any substantive task.
  - **Commits**: the `commit-msg` hook (`.git/hooks/commit-msg`) enforces conventional commits. Type and scope are one release decision, never chosen independently: `feat` (minor) / `fix` (patch) mark deltas to a published package's user-facing API — runtime OR exported type surface (an exported `.d.ts` type alias alone is a `feat`) — and MUST scope to that workspace's name (`feat(dom)`, `fix(css)`); `feat`/`fix` with any other scope (`docs`, `agents`, …) is invalid. Everything else — docs, scripts, agent-config, tests, tooling, internal structure — takes `docs`/`chore`/`refactor`/`test` no matter how novel. A mixed commit containing any package-API delta takes that delta's type + package scope. Breaking API changes add `!` + a `BREAKING CHANGE:` footer (major). Releases are user-handled end to end: never publish.
  - **Never create a changeset.** `.changeset/*.md` files and `vp run changeset` are user-only, exactly like commits — even for published-package behavior changes. Note the need in the handoff summary; never list changeset creation in a plan's DoD.
  - **DoD discipline** — every pass criterion is a runnable check, never a predicted result. The seven-trap list (predicted-result DoDs, unverified characterizations, unprobed type premises, tiered-tool scoping, sweep-DoD self-matching, DoD-gloss/delta mismatch, threshold/lever arithmetic) is owned by the `plan` skill, Phase 3.

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
  | headless | Headless behavior functions (focus trap, escape/outside dismissal, roving tabindex, anchor positioning, hover intent, menu typeahead, pointer drag/swipe/pinch/long-press/double-tap, layered dismissal) plus the foundation layer the ui registry templates consume; takes signals in and returns wiring (state stays in the user's signals). Deps core+dom. |
  | css | Type-safe CSS-in-JS: `css()` + scoped `style()` (content-hashed class), `cssText()` SSR collector, text-keyed refcounting, reactive `vars()`, `cva()` recipes, `cx()`. |
  | resource | Reactive async fetching: fetcher-scoped cache (LRU + TTL), dedup, SWR, abort control, optimistic mutations, polling/retry. |
  | router | Reactive routing: nested routes, parameter inheritance, lifecycle hooks, History API. Resolution: redirects → nested → flat → notFound. |
  | store | Deeply reactive state: plain objects auto-convert to granular signals/stores with TS inference; `$snapshot` / `$update` / `$cleanup` / `$subscribe`. |
  | ssr | Pure HTML stringifier: HellaNode AST → HTML, zero runtime imports (mirrors dom's `renderProp` rules). `resource` no-ops on the server. |
  | ui | Copy/paste component registry + CLI: `npx @hellajs/ui add <name>` copies one canonical `<name>.tsx` component file with the style module spliced in (css: unlayered `style()` maps; tailwind: class strings inlined into `cn(…)` at the element, keyed maps kept); split theme (`tokens.ts` / `theme.css`, with the `themeMode` config selecting the dark-default `tokens.dark.ts` sheet); compiles to `dist/registry` for tests + the docs-ui generator; no importable component surface. |

  ## Plugins

  Workspaces under `plugins/` — build-time transforms. `babel` and `astro` have their own `AGENTS.md` and tests; `vite`/`rollup` are thin wrappers.

  | Plugin | Responsibility |
  |---|---|
  | babel | Core compile-time transform: JSX → HellaNode. Attribute prefixes (`on:` / `e:` / `hook:` / `error:`), component detection + `component(...)` wrapping. |
  | rollup | Thin Rollup wrapper around the babel plugin (`index.mjs`). |
  | vite | Thin Vite wrapper around the babel plugin (`index.mjs`). |
  | astro | Astro 7 renderer: `addRenderer` + `vite-plugin-hellajs` wiring, server `renderToStaticMarkup` → `ssr`, client → `hydrate`, slot passthrough via `raw()`, frontmatter `css()`/`style()` build-time extraction via virtual CSS imports. Exclusive-use. Own `AGENTS.md` + tests. |

  ## Scripts

  Invoke as `vp run <name> [package]` (or `npm run <name>`); the `[package]` arg scopes `bundle`, `clean`, and `coverage` to one workspace. Test-gate semantics and triage protocol: `guides/tests.md` §Triage & Gate Semantics.

  | Name | Command | What it does |
  |---|---|---|
  | coverage | `vp run coverage [package\|plugin]` | bundle + `vp test --coverage` — no lint (`vp run lint` is its own gate). With `[package|plugin]`: tests scope to it and the coverage includes narrow to its rows (package `dist/` rows / plugin source `.mjs` rows — plugins have no dist), so vitest's own table scopes itself. CI runs coverage + lint, both unscoped. The single test gate — always paired with `vp run lint` (§Testing). |
  | bench | `vp run bench [--runs] [--throttle] [--label] [--ops] [--headed]` | Playwright + system Chrome macro-benchmark over `examples/bench`: all 8 krausest ops, appends self-describing entries to `.bench/results.md`. A/B is manual (`git checkout` both refs, compare log) — but frame-quantized ops (rAF-polled predicates at 4x throttle) wobble ±10ms on inert bundle-byte shifts (code layout → JIT/paint timing): before attributing a small delta or an unexplained regression, run an inert-bytes control (append a never-called export, re-run) — if the control moves the same amount, the delta is layout noise, not the change. Rebuilds all packages first; requires local Chrome. |
  | worker | `bun worker <set-folder> [--wt=single\|split] [--model=…] [--thinking=…]` | Fresh `pi --mode rpc` instance per unticked plan unit, executing inside component worktrees (`--wt=split`: one per dependency-connected component). Never merges — completed components stand for `bun merge <set>`, the single human checkpoint. Ticks are read from worktree copies; main-tree copies stay `[ ]` until merge (success, not failure). Gates: retry / deliver-incomplete / abandon / halt. Worktree mechanics: `worker` skill. |
  | bundle | `vp run bundle [package]` | Build `dist/` bundles. |
  | lint | `vp run lint` | `./node_modules/.bin/vp check` (single static-checks entry: oxfmt format check + oxlint + tsgolint type-check; `vite.config.ts` fmt/lint blocks + `lint/hellajs.js` JS-plugin rules) + `npm run lint:guards`. |
  | lint:guards | `vp run lint:guards` | The six guards composed (below); standalone to skip vp check. |
  | clean | `vp run clean [package]` | Remove build artifacts. |
  | changeset | `vp run changeset` | Add a changeset entry (user-only — §Core rules). |
  | release | `vp run release` | Bundle, then publish via changesets (user-only). |
  | visibility | `vp run visibility` | Guard: fail if a wholesale-exported `types*.d.ts` contains `@internal`-tagged types (would leak public). |
  | dead-exports | `vp run dead-exports` | Guard: fail if any exported symbol has zero value-position references across source, tests, docs. |
  | jsdoc-params | `vp run jsdoc-params` | Guard: fail if a `function` declaration's JSDoc `@param` name matches no parameter. |
  | lint:structure | `vp run lint:structure` | Guard (`scripts/doc-structure.ts`), seven docs-structure checks: fence parity, tutorial Complete-Code parity, site anchor resolution, wrapper validity, nav/index registration, example conventions (children-unknown prop types, Internal Mechanics details blocks, alert icon spans, blockquote warning markers, function-wrapped jsx/tsx attributes, single-line css/style object arguments), table delimiter parity. |
  | merge | `bun merge <set-folder> [--model=…] [--thinking=…] [--dry-run]` | Fresh instance per outstanding component worktree, executing the `merge` skill contract: mechanical queue derivation, completeness pre-check, per-component progress gate, orchestrator-owned index flip + union gate (`vp run coverage <pkg|plugin>` from the set's scope or its runtime-delta packages, `vp run lint` fallback), one fix instance per red round, then removal of the fully-ticked set folder (empty parents pruned; also on an empty-queue re-run, never `--dry-run`). `--dry-run` prints the queue. The single human checkpoint. |
  | audits | `bun audits <package> [--section=code\|tests\|docs] [--model=…] [--thinking=…] [--dry-run]` | Fresh instance per package section (fixed code → tests → docs order), each running the matching `audit-*` skill then authoring its own findings plan set under `plans/<pkg>/audit/<section>/` (three separate sets, executable via `bun worker`). Findings set present → next section; neither a set nor a clean statement → operator gate (retry / accept-clean / skip / halt). Accepts `core` or `packages/core`. `--dry-run` prints derived sections + set dirs without spawning. |
  | memory | `bun memory [--start-id=<n>] [--limit=<n>] [--model=…] [--thinking=…] [--dry-run]` | Knowledge-base verification runner: one fresh instance per memory entry in ID order from the beginning (`--start-id` floors the sweep, `--limit` caps it — default 10, `0` = no cap), each running the memory skill's Step 5 verify on one entry — still true → `confirm` date bump (+ in-place drift fix); false/reversed → delete the entry, author the corrected fact fresh; blocked/no-verdict → one retry, then auto-skip (never prompts — AFK-safe); nonzero exit signals skips. The runner never verifies and never writes KB content — instances do; the outcome signal is the entry file's before/after state. `--dry-run` prints the queue. |
  | doc-snippets | `vp run doc-snippets` | Audit tool (NOT a guard, `scripts/doc-snippets.ts`): typechecks every package-doc code block; strict tier gates the exit code, tutorials report informationally. Emits into and resets gitignored `.doc-snippets/` — never stage scratch files there. |
  | docs-ui | `vp run docs-ui [entry ...]` | Regenerate the docs ui generated sources — two variant dirs of exact `add` output under `docs/src/ui-install/` (`css-jsx/<name>.tsx`, `tailwind-jsx/<name>.tsx`) plus the live css-jsx component set (59 `<name>.tsx` + `tokens.ts`) under `docs/src/components/ui/`, all via the public `addComponent` API. Requires `vp run bundle ui` first. No args = all components (prunes both output roots first); named args overwrite only those entries' files plus `tokens.ts`. |
  | doc-links | `vp run doc-links` | Guard: fail if a doc link's display name is not a barrel export of its target package (rename drift), or an internal site URL matches no `.mdx` under `docs/src/pages/` (link rot). |
  | em-dash | `vp run em-dash` | Guard (`scripts/em-dash.ts`): fail if a user-facing file contains an em/en dash or HTML entity, fences included. Allowlist-include scan (READMEs, package docs, comparisons, tutorials, docs-site pages, changesets); agent-only files exempt. Rewrites: `guides/docs.md` §Typography. |

  ## Skills

  Fourteen first-party skills: a behavioural backbone, a discovery→plan→worker→feedback→memory loop, the production skills (author, docs-writer), and the meta skills maintaining it. Edit them directly via `author` (voice, skill anatomy, cross-reference sync); `feedback` proposals may target skills as well as `AGENTS.md`. No global-inherited layer, no graceful-degradation fallback. `prime` loads first on any substantive task; the rest are discovered on demand.

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
  | `feedback` | After a run: thread-scan the session transcript (failed/repeated commands, context bloat, wasted round-trips) for ground-truth evidence, then conservatively apply config/skill edits, uncommitted. |
  | `memory` | Persist verified decisions/facts to `memory/`; refresh/nuke. |
  | `author` | Author/revise `AGENTS.md`, agent prompts, rules files, skills. Standalone. |
  | `docs-writer` | Produce/revise package docs: read the source contract, frame by reader task, draft example-first, hold internals to the budget; pairs with `guides/docs.md` (rules) as its production counterpart. Standalone. |

  Plus one standalone project skill outside the pack: `comparison` (`.agents/skills/comparison/`) — generate a package comparison doc vs competitors.

  ## Response protocol

  After any substantive work (skill used, files edited, commands run, decision made), state a one-sentence handoff gate: name the skill the work hands off to and justify in one clause. Any skill can be the right target — decide critically, not reflexively. Full gate detail and self-checks: `prime`. Mandatory — silently skipping the gate equals skipping a verification step.

  | Condition | Action |
  |---|---|
  | Worker completes a plan unit | Completion pipeline fires the matching `audit-*` skill (Code → `audit-code` — judgment lenses included when the unit changed a public surface, Tests → `audit-tests`, Docs → `audit-docs`, scripts/config → `audit-scripts`) → redo (in-contract, one) → `feedback` → `memory` on events |
  | Loop completed with friction | `feedback` (applies via `author`, uncommitted) |
  | Non-obvious decision, not already durable | `memory` |
  | Actionable change surfaced (bug, gap, needed edit) | `plan` |
  | Multiple | Each, labeled and justified |
  | None (trivial, clean run, mid-loop) | Say "nothing to hand off" and finish |

  ## Style guides

  Read the matching guide before editing — each is a decision procedure (Contents decision index at top, trees + canonical paths/examples next, rules in the middle, verification checklist at the end). The Contents index is the entry point: match the decision at hand to its row, then `read` that section (offset/limit on the long guides); one edit often pulls several rows — a test edit touches both §Assertion Patterns and §Code Style. Never write from memory of an earlier read: on multi-file tasks, re-slice the governing sections before each new file. A rule edit syncs the checklist item that audits it in the same pass — the matching `audit-*` skill ticks the checklist, not the prose.

  | Trigger | Guide |
  |---|---|
  | Writing/editing source, types, JSDoc, imports, package structure | `guides/code.md` |
  | Writing tests or assertions | `guides/tests.md` |
  | Writing docs, `.mdx`, or examples | `guides/docs.md` + `docs-writer` skill (production method) |
  | Writing build scripts (`scripts/**`, `utils/**`) | `guides/scripts.md` |

  Config files (`tsconfig*`, `vite.config.ts`, `lint/*.js`, `package.json`, build plugins) follow `guides/code.md` plus its Config verification checklist. A file is verified against the guide matching its *own* extension, not the task's Type tag — a `*.test.ts` against `tests.md`, `.md`/`.mdx` against `docs.md`, `*.ts`/`*.tsx`/`*.mjs` under `lib/`/`scripts/`/`plugins/` against `code.md`.

  ## Folder structure

  - `.agents/skills/` — the thirteen first-party skills + `comparison/` (standalone).
  - `../hellajs-wt/` — per-component worktrees (`wt/<slug>` branches), protocol-owned: seeded by `worker`'s `worktree.mjs`, merged back only by `bun merge`. A worktree may host a live instance mid-unit: never run mutating commands (coverage/bundle/clean, any write) in one you don't own — probe read-only (`worktree.mjs list`/`status`, file reads).
  - `.changeset/` — changeset config.
  - `.github/` — workflows (CI + release).
  - `docs/` — Astro docs site, importing package docs from `packages/*/docs/`. **A Docs task spans the full site surface**: `learn/concepts/` + `learn/patterns/` + `learn/tutorials/` wrapper pages, `reference/{pkg}/` API wrappers, the `ui/` section (59 self-contained `docs/src/pages/ui/<name>.astro` pages: `Component` cards (`docs/src/components/Component.astro`) render a `<name>-demo` export element — interactive demos take `client:load` on the element the page passes, since prop-passed components cannot carry hydration directives — in a demo frame plus a `CodeExample` card that slices the named export's raw source out of `docs/src/demos/<name>-demo.tsx` through `docs/src/utils/example-code.ts` (loud build-time throws on unknown demo/export); the demos import the script-generated live set under `docs/src/components/ui/` (byte-exact `add` output + the tokens sheet, committed), with the generated theme sheet imported once in `Component.astro` (the light sheet: its `.dark` class block carries the site's dark values — `tokens.dark.ts` is the dark-DEFAULT alternative, not the site sheet) — the site is dark-only: `body` carries the `dark` class so portal-mounted surfaces inherit the registry default dark palette, while the site palette rescopes to the `.docs-palette` wrapper each layout wraps its body content in; `InstallSection` renders two generated variant dirs of exact `add` output under `docs/src/ui-install/` — `css-jsx/<name>.tsx`, `tailwind-jsx/<name>.tsx`, regenerated with `vp run docs-ui [entry ...]` after `vp run bundle ui`; site code imports nothing from the ui package), the package-doc tag, `nav.ts` registration, and the enumeration indexes. `docs/package.json` declares no `@hellajs/*` — runtime imports resolve via root `node_modules` walk-up (`docs/node_modules` holds no `@hellajs`). A user-facing feature needs: a concept doc, a pattern doc when copy-paste recipes apply, `nav.ts` registration, and every enumeration listing it updated. Before scoping a Docs task, grep the site for prose claims the change falsifies (e.g. an "X not supported" alert).
  - `examples/` — `bench`, `blog`, `counter`, `theme-switcher`, `todo`, `ssr-islands`, `ssr-routing`, `ssr-streaming`, `astro-islands`. NOT root workspaces (root `workspaces` = `packages/*, plugins/*`): each installs standalone (`npm install` inside the example; committed per-example `package-lock.json` pins tooling), declares only framework tooling (vite/astro/hono/rollup, plus the ssr examples' babel compile-pass deps), and imports `@hellajs/*` + the hellajs plugins as bare specifiers resolved via root `node_modules` walk-up — the root devDependencies declare every `@hellajs/*` package and plugin as `*`, so one root `npm install` makes them all resolvable. Never `npm install @hellajs/<pkg>` inside an example: it writes a registry version that shadows the root-walk-up link with a stale installed copy; configs import plugins as bare specifiers (`vite-plugin-hellajs`, `rollup-plugin-hellajs`, `astro-plugin-hellajs`). All except `bench` carry `tutorial.mdx` next to the code (`guides/docs.md` §Tutorial Docs); tutorials keep npm-shaped install recipes (the published-package reader experience), which do not mirror the in-repo resolution.
  - `guides/` — style guides (§Style guides).
  - `memory/` — flat `NNN-slug.md` entries, self-contained (no cross-references, no plan citations); `memory` skill is the single writer.
  - `packages/` — the nine workspaces.
  - `plans/` — agent-generated plan contracts at `plans/<package>/<category>/<topic>/`. Files-list derivations: rename/removal plans → repo-wide `rg '<old-name>'` (comparison docs, READMEs, tutorials, nav — prose enumeration misses them); behavior-contract changes → repo-wide `rg` of the claim sentence falsified; sweep-DoD plans → the DoD's own `rg` pattern's match set — and repo-wide sweeps run `--hidden` (`-g '!.git'`): `.agents/`, `.github/`, `.changeset/` are hidden dirs rg silently skips by default. Comparison-delta competitor cells cite the competitor source per cell or route through `comparison` (workers lack web access). A unit's delta describes the state after that unit, never a later unit's end-state.
  - `plugins/` — `babel`, `rollup`, `vite`, `astro`.
  - `scripts/` — build/CI automation + `utils/` + `bundle/` pipeline; see `scripts/AGENTS.md` and `guides/scripts.md`.
  - `utils/` — `test-helpers.js` (shared test utilities: `delay`, `resetTestState`, DOM setup, console suppression, JSX fixture compile + compiled-module execution for hydration-parity harnesses).
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

  Tests run under Vitest 5 via the local vite-plus CLI (`vp test` through the root `vite.config.ts`): the happy-dom environment and the JSX transform (`vite-plugin-hellajs`) come from that config; conventions (framework, imports, structure, anti-patterns, the checklist): `guides/tests.md`. Gate semantics and triage protocol (scoped runs, foreign failures, plugin scoping, blind spots, measurement target): `guides/tests.md` §Triage & Gate Semantics. The `vite.config.ts` setup applies only to `vp test` — a one-off DOM-dependent probe runs as a scratch `*.test.ts` under the package's `tests/` (deleted after), never `node -e` (no happy-dom environment).

  **NEVER verify with bare `vp test` (or `vitest`)** — `packages/` tests import `dist/` bundles and a bare runner never rebuilds them (silently stale). The test gate is `vp run coverage <package>`. Mid-flight iteration only: `node ./scripts/bundle.ts <package> --quiet && rm -rf node_modules/.vitest-cache && NODE_OPTIONS=--expose-gc ./node_modules/.bin/vp test packages/<package>/tests[/<file>.test.ts]` — the cache clear is mandatory after every bundle (Vitest 5's fs module cache serves stale transforms), and `--expose-gc` matches the coverage gate for GC-canary tests (`gc?.()` throws undeclared otherwise). Never list a bare `vp test` in a plan's DoD when `vp run coverage` is present; the gate runs no lint, so every verification pass and every plan DoD pairs coverage with `vp run lint` — lint green is a completion condition (worker's type floor enforces it), not CI's to catch — the mechanical subset (fmt check + the `hella/*` JS-plugin rules: banned loops/guards in `packages/*/lib`, banned test APIs in `*.test.ts`) lives there; the rest of the guides' structural rules and anti-patterns are audit-enforced — a new file, file structure, or shared test helper gets the matching `audit-*` skill run as part of verification.

  Plan-file worker runs execute in a component worktree (`../hellajs-wt/<slug>/`, seeded by `worker`'s `worktree.mjs`): bundle/coverage run inside the worktree; merge-back lands via `bun merge`. Inline plans and foreign-failure triage are unchanged.
</hellajs-agent>
