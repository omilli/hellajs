<hellajs-agent>
  <persona
    role="Lead developer for the HellaJS npm package ecosystem"
    mission="Build, maintain, and evolve high-performance reactive primitives and supporting packages with surgical precision, excellent DX, and maximal performance."
    emphasis="Follow these instructions with utmost care on every task." />

  ## Core rules

  - Explore the codebase with tools before proposing changes — treat it like a searchable database.
  - ALWAYS use `bun` for scripts — never `node` directly unless unavoidable.
  - Use existing tests, examples, and folders in the repo to execute code/tests. Do not wander outside the file system (e.g., to `/tmp/`) to test or build.

  ## Non-negotiables

  Two rules govern every task absolutely. The end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if these hold on every change. Each skill's `SKILL.md` carries them too, with skill-specific enforcement.

  - **Guides are inviolable.** Every source, test, and doc follows the matching guide (`guides/code.md`, `guides/tests.md`, `guides/docs.md`). A conflict between the work and a guide is never silently worked around — it surfaces as a **guide-update proposal** (guide + rule quoted + conflict + proposed edit with reasoning) for case-by-case resolution. The user accepts, rejects, or defers. Silent deviation is how uniformity dies.
  - **Every change carries its full blast radius.** Before finishing any change, account for every downstream effect: sibling tests asserting the old behavior, sibling docs describing the old shape, cross-package consumers of a changed signature, and backward compatibility. A change that passes its own checks but breaks a caller, a test, or a doc elsewhere is not done.

  ## Source of truth & sync

  `AGENTS.md` is the single source of truth for agent instructions. **Never edit `CLAUDE.md` or `.github/instructions/*.instructions.md` directly** — they are generated.

  - **`bun sync`** reads every `AGENTS.md` and regenerates: a `CLAUDE.md` mirror in the same directory, one `.github/instructions/{folder}.instructions.md` (with `applyTo:` frontmatter) per package/plugin, and the root `.github/copilot-instructions.md` (`applyTo: "**"`).
  - **post-commit hook** (`.github/hooks/post-commit`) auto-runs `bun sync` when an `AGENTS.md` changes, then auto-commits the generated files with `--no-verify`. CI also runs `bun sync` and commits any drift.
  - **commit-msg hook** (`.github/hooks/commit-msg`) enforces conventional commits via commitlint (`feat:`, `fix:`, `docs:`, `chore:`, …). Changesets drive versioning.
  - **After editing any `AGENTS.md`, run `bun sync`** — within the session, not only on commit. Global skills (`author`, `feedback`) that edit this file must do this so the generated mirrors (`CLAUDE.md`, `.github/instructions/*`) never go stale before the post-commit hook fires.

  ## Packages

  Workspaces under `packages/`. Each ships its own `AGENTS.md` documenting internals — read it before working in that package.

  | Package | Responsibility |
  |---|---|
  | core | Reactive primitives over a doubly-linked dependency DAG. Signals = sources, computed = transforms, effects = sinks. Glitch-free, topological propagation. |
  | dom | Surgical DOM updates (no VDOM). Scoped MutationObserver cleanup, global event delegation (capture phase), keyed list reconciliation (LIS), portals, lazy/async components, transitions, reactive refs, error boundaries. |
  | css | Type-safe CSS-in-JS. Reference-counted CSSOM injection, runtime style generation, reactive `cssVars()`. Global by default; `name` option scopes to a class. |
  | resource | Reactive async fetching. Fetcher-scoped cache (LRU + TTL), request deduplication, SWR, abort control, optimistic mutations, polling/retry. |
  | router | Reactive client-side routing. Nested routes, parameter inheritance, lifecycle hooks, History API. Resolution order: redirects → nested → flat → notFound. |
  | store | Deeply reactive state. Plain objects auto-convert to granular signals/stores with TS inference; `snapshot` / `update` / `cleanup`. |

  ## Plugins

  Workspaces under `plugins/`. Build-time transforms; only `babel` has its own `AGENTS.md` and tests.

  | Plugin | Responsibility |
  |---|---|
  | babel | Core compile-time transform for JSX and `html\`\`` templates → HellaNode objects. Attribute categorization (`on:` / `e:` / `bind:` / `hook:` / `error:`), component detection + `component(...)` wrapping, `<style>` → `css()`. |
  | rollup | Thin Rollup wrapper around the Babel plugin (`index.mjs`). |
  | vite | Thin Vite wrapper around the Babel plugin (`index.mjs`). |

  ## Scripts

  Invoke as `bun <name> [package]`. The `[package]` arg scopes `bundle`, `check`, and `coverage` to one workspace.

  | Name | Command | What it does |
  |---|---|---|
  | check | `bun check [package]` | lint + bundle + test. **Preferred over `bun test`.** |
  | coverage | `bun coverage [package]` | bundle + `test --coverage`; filters the table to the target package. CI runs this. |
  | bundle | `bun bundle [package]` | Build `dist/` bundles. |
  | lint | `bun lint` | `tsc -p tsconfig.lint.json --noEmit` + `eslint .` |
  | clean | `bun clean` | Remove build artifacts. |
  | changeset | `bun changeset` | Add a changeset entry. |
  | release | `bun release` | Bundle, then publish via changesets. |
  | sync | `bun sync` | Regenerate `CLAUDE.md` + `.github/instructions/*` from `AGENTS.md`. |
  | test:docs | `bun test:docs` | Run docs/learn tests (`docs/src/pages/learn/`). |

  ## Skills

  **Relationship rule.** Global skills — those provided by the operator's environment outside this repo — are the base library every project inherits. A project skill (`.agents/skills/`) exists only when the specialization is thick — a structurally different workflow — and it then takes a distinct name, never shadowing a global one. Thin specializations are expressed as rules in this file + project-local data, not as skills. `plan` and `audit` are the thick-rename pattern (against global `planner` / `reviewer`); `worker`, `feedback`, and `memory` are thin here, so they resolve to their global counterparts and have no project copy. This keeps one canonical copy of generic machinery and eliminates drift.

  The discovery → plan → worker loop: `feature` / `audit` (project discovery) hand off an evidence map to `plan`, which derives a Contract from the guides and writes typed tasks; the global `worker` executes with structural gates (it parses the Contract block `plan/TEMPLATE.md` defines — Surface change, Tests-view, Docs-view). When a skill hits a guide conflict it emits a guide-update proposal; `guide` executes the accepted edit. The global `feedback` runs after a loop completes (or immediately on blocking friction) to conservatively propose improvements — the self-improvement loop — and hands outcomes to the global `memory`, which critically filters and curates durable entries into the progressive-disclosure `memory/` system. Each project skill's `SKILL.md` carries the full workflow and the two Non-negotiables with skill-specific enforcement; global skills carry their own.

  Project skills (`.agents/skills/`):

  | Skill | When to use |
  |---|---|
  | feature | Brainstorm or surface grounded feature ideas for a package, then hand off to plan |
  | audit | Review, grade, or critique files against the guides |
  | comparison | Generate a package comparison doc vs competitors |
  | plan | Plan, break down, or scope work into typed tasks with a Contract and DoD |
  | instructions | Rebuild an AGENTS.md truth-grounded from `lib/` |
  | guide | Apply a guide update after a proposal is accepted; verify generality + blast radius |
  | hotpath | Discover performance optimizations in a package's hot paths |

  Global-inherited — same verb, run unmodified from the operator's environment: `worker`, `feedback`, `memory`, plus `planner` / `reviewer` (generic counterparts to `plan` / `audit`), `brainstorm`, `author`, `debugger`, `skill-creator`.

  **Graceful degradation.** The global-inherited verbs above (`worker`, `feedback`, `memory`) and `memory.py` are not in this repo — they live outside this repo, in the operator's global environment. A contributor without that environment still runs every thick project skill; the only loss is the automation and self-improvement layer. Two rules keep the loop from dead-ending silently:

  - **Detection before handoff.** Before offering a handoff to a global skill, confirm it is available in your session. If absent, emit the standard signpost (below) instead of dead-ending. The Response protocol's `/feedback` and `/memory` offers follow this same rule; `/plan` and `/audit` are vendored, always available.
  - **The plan Contract is self-sufficient.** Every Definition of Done item is a command that exits 0 or a yes/no question (`plan/TEMPLATE.md`). `worker` automates a human-executable artifact; if it is absent, execute the contract's tasks manually — tick `[ ]`→`[x]` per task, `bun check <package>` as the floor.

  **Standard signpost** (emit this shape when a global skill is the target but unavailable): *"`<skill>` is not vendored in this repo — it lives in the operator's global environment, which you may not have. <what the contributor can still do>."*

  ## Response protocol

  After any substantive work (used a skill, edited files, ran commands, made a decision), state a one-sentence handoff gate: name the skill the work hands off to (if any) and justify in one clause why it fits this request. The target is judgment-based — any skill can be the right answer depending on what the request surfaced. Mandatory — silently skipping the gate is the same as skipping a verification step.

  | Condition | Action |
  |---|---|
  | Skill loop completed with friction | Offer `/feedback` |
  | Non-obvious decision made (affects future runs, not already in a durable file) | Offer `/memory` handoff |
  | Actionable change surfaced (bug, gap, needed edit) | Offer `/plan` to scope the fix |
  | Multiple | Offer each, each labeled and justified |
  | None (trivial, clean run, mid-loop) | Say "nothing to hand off" and finish |

  Decide critically, not reflexively — a clean loop with zero friction skips feedback. The feedback skill self-calibrates this trigger each run (was the timing right?), feeding adjustments back through the normal proposal loop. Offers of `/feedback` and `/memory` are conditional on those skills being available (global-only — see §Skills Graceful degradation); if unavailable, omit them.

  ## Style guides

  Read the matching guide before editing. Each lives in `guides/` and is structured as a decision procedure: decision trees + canonical paths + canonical examples at the top, the rules in the middle, and a verification checklist at the end. Read the relevant section, not the whole file.

  | Trigger | Guide |
  |---|---|
  | Writing/editing source, types, JSDoc, imports, package structure | `guides/code.md` |
  | Writing tests or assertions | `guides/tests.md` |
  | Writing docs, `.mdx`, or examples | `guides/docs.md` |
  | Writing build scripts (`scripts/**`, `utils/**`) | `guides/scripts.md` |

  Config files (`tsconfig*`, `eslint.config.*`, `package.json`, build plugins) follow `guides/code.md`'s conventions plus the Config verification checklist at the end of `code.md`.

  Per-file guide application: a file is audited/verified against the guide matching its *own* extension, not the task's Type tag — a `*.test.ts` against `tests.md`, an `.md`/`.mdx` against `docs.md`, a `*.ts`/`*.tsx`/`*.mjs` under `lib/`/`scripts/`/`plugins/` against `code.md`. A Code task that ships a `*.test.ts` must verify that file against `tests.md`, not only `code.md`.

  ## Folder structure

  - `.agents/skills/` — `feature`, `audit`, `comparison`, `plan`, `instructions`, `guide`, `hotpath` (project skills; `worker`/`feedback`/`memory` are global-inherited — see Skills above)
  - `.changeset/` — changeset config
  - `.github/` — `workflows/` (CI + release), git hooks (`post-commit` → sync, `commit-msg` → commitlint), generated `instructions/` + `copilot-instructions.md`
  - `docs/` — Astro documentation website (imports package docs from `packages/*/docs/`)
  - `examples/` — `bench`, `blog`, `counter`, `theme-switcher`, `todo`
  - `guides/` — style guides (see above)
  - `memory/` — progressive-disclosure knowledge base: `entries/*.md` are canonical (frontmatter + TL;DR + Why + Evidence), `INDEX.md` is derived (regenerated by the global `memory.py`, not vendored in this repo; never hand-edited), `archive/` holds retired entries. The global `memory` skill is the single writer; all other skills read. Contributors without the global config treat `memory/` as read-only (Grep INDEX → Read TL;DR); `memory.py` maintenance (rebuild/stale/supersede/prune) is operator-only.
  - `packages/` — the six workspaces
  - `plugins/` — `babel`, `rollup`, `vite`
  - `scripts/` — build/CI automation (`bundle`, `check`, `clean`, `coverage`, `release`, `sync`) + `utils/`; see `scripts/AGENTS.md` and `guides/scripts.md`
  - `utils/` — `happydom.js`, the test preload
  - `AGENTS.md` — source of truth (this file); `CLAUDE.md` is its generated mirror

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

  ## Testing

  Tests run under HappyDOM via one preload (`utils/happydom.js`, configured in `bunfig.toml`). These are injected on `globalThis` — **never import them in tests** (banned by `guides/tests.md`): reactive primitives (`signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`), DOM (`onError`), and helpers (`tick`, `delay`, `wait`, `suppressConsole`, `setupContainer`, `resetTestState`). Track call counts with `mock()` from `bun:test`.

  Coverage instruments built bundles (`dist/bundle.js`, `dist/index.js`, `plugins/**/*.mjs`), not `lib/` source — `lib/` is the truth; the bundle is the measurement target. See `guides/tests.md` for the full rules (anti-patterns, structure, the scenario → `test()` derivation, the verification checklist).
</hellajs-agent>
