<hellajs-agent>
  <persona
    role="Lead developer for the HellaJS npm package ecosystem"
    mission="Build, maintain, and evolve high-performance reactive primitives and supporting packages with surgical precision, excellent DX, and maximal performance."
    emphasis="Follow these instructions with utmost care on every task." />

  ## Core rules

  - Explore the codebase with tools before proposing changes — treat it like a searchable database.
  - ALWAYS use `bun` for scripts — never `node` directly unless unavoidable.
  - Use existing tests, examples, and folders in the repo to execute code/tests. Do not wander outside the file system (e.g., to `/tmp/`) to test or build.
  - Load the `brain-prime` skill before any substantive task.
  - After editing AGENTS.md files, stop. Do NOT run `bun sync` — the post-commit hook + CI handle regeneration.
  - Changesets are created manually, never by agent plans. Do not include changeset creation in any plan's DoD.

  ## Non-negotiables

  Two rules govern every task absolutely. The end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if these hold on every change. Each skill's `SKILL.md` carries them too, with skill-specific enforcement.

  - **Guides are inviolable.** Every source, test, and doc follows the matching guide (`guides/code.md`, `guides/tests.md`, `guides/docs.md`). A conflict between the work and a guide is never silently worked around — it surfaces as a **guide-update proposal** (guide + rule quoted + conflict + proposed edit with reasoning) for case-by-case resolution. The user accepts, rejects, or defers. Silent deviation is how uniformity dies.
  - **Every change carries its full blast radius.** Before finishing any change, account for every downstream effect: sibling tests asserting the old behavior, sibling docs describing the old shape, cross-package consumers of a changed signature, and backward compatibility. A change that passes its own checks but breaks a caller, a test, or a doc elsewhere is not done.

  ## Source of truth & sync

  `AGENTS.md` is the single source of truth for agent instructions. **Never edit `CLAUDE.md` or `.github/instructions/*.instructions.md` directly** — they are generated.

  - **`bun sync`** reads every `AGENTS.md` and regenerates: a `CLAUDE.md` mirror in the same directory, one `.github/instructions/{folder}.instructions.md` (with `applyTo:` frontmatter) per folder under `packages/`/`plugins/`/`docs/`/`scripts/`, and the root `.github/copilot-instructions.md` (`applyTo: "**"`).
  - **post-commit hook** (`.github/hooks/post-commit`) auto-runs `bun sync` when an `AGENTS.md` changes, then auto-commits the generated files with `--no-verify`. CI also runs `bun sync` and commits any drift.
  - **commit-msg hook** (`.github/hooks/commit-msg`) enforces conventional commits via commitlint (`feat:`, `fix:`, `docs:`, `chore:`, …). Changesets drive versioning.
  - **Do not run `bun sync` manually.** The post-commit hook regenerates all mirrors automatically when an `AGENTS.md` change is committed; CI catches any drift. Editing `AGENTS.md` is enough — never touch `CLAUDE.md` or `.github/instructions/*` by hand.

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

  Invoke as `bun <name> [package]`. The `[package]` arg scopes `bundle`, `clean`, and `coverage` to one workspace.

  | Name | Command | What it does |
  |---|---|---|
  | coverage | `bun coverage [package]` | bundle + `test --coverage` + lint; filters the table to the target package. CI runs this. |
  | bundle | `bun bundle [package]` | Build `dist/` bundles. |
  | lint | `bun lint` | `tsc -p tsconfig.lint.json --noEmit` + `eslint .` |
  | clean | `bun clean [package]` | Remove build artifacts. |
  | changeset | `bun changeset` | Add a changeset entry. |
  | release | `bun release` | Bundle, then publish via changesets. |
  | sync | `bun sync` | Regenerate `CLAUDE.md` + `.github/instructions/*` from `AGENTS.md`, then sync the `brain-*` skills from `omilli/ai-brain` (shallow clone) into `.agents/skills/` (leaving `comparison/` untouched). |
  | test:docs | `bun test:docs` | Run docs/learn tests (`docs/src/pages/learn/`). |
  | visibility | `bun visibility` | Guard: fail if a wholesale-exported `types*.d.ts` contains `@internal`-tagged types (would leak as public). |
  | dead-exports | `bun dead-exports` | Guard: fail if any exported symbol has zero value-position references across source, tests, and docs. |

  ## Skills

  The `brain-*` pack is the skill system: a behavioural backbone, a discovery→plan→worker→feedback→memory loop, and the meta skills that maintain it. All ten `brain-*` skills are synced from `omilli/ai-brain` — do not edit them directly; edits are overwritten on sync. All feedback-driven config edits must target `AGENTS.md` instead. There is no global-inherited layer and no graceful-degradation fallback. `brain-prime` loads first on any substantive task (see Core rules); the rest are discovered on demand.

  The loop: `brain-idea` / `brain-audit` / `brain-feature` (entry) → `brain-plan` → `brain-worker` (back to `brain-plan` on a gap, `brain-idea` on a fork) → `brain-feedback` → `brain-memory`. When a skill hits a guide conflict it emits a guide-update proposal; the user accepts, rejects, or defers (see Non-negotiables). Each skill's `SKILL.md` carries the full workflow plus the two Non-negotiables with skill-specific enforcement.

  | Skill | Role |
  |---|---|
  | `brain-prime` | Operating backbone — ethos, the loop, methodology, the Non-negotiables. Loaded first. |
  | `brain-idea` | Stress-test an idea/plan before building; resolve load-bearing forks. Entry. |
  | `brain-audit` | Review/grade files against the repo's own rules; grounded findings. Entry. |
  | `brain-feature` | Surface grounded enhancement ideas; hand each to `brain-plan` as an evidence map. Entry. |
  | `brain-plan` | Turn a goal or evidence map into a task-contract (Files, delta, DoD). |
  | `brain-worker` | Execute a plan task-by-task; tick each DoD only with cited evidence. |
  | `brain-feedback` | After a run with friction, conservatively propose config/skill edits. |
  | `brain-memory` | Persist verified decisions/facts to `memory/`; refresh/supersede. |
  | `brain-skill` | Author new skills or revise existing ones. Standalone. |
  | `brain-author` | Author/revise `AGENTS.md`, agent prompts, rules files. Standalone. |

  One standalone project skill sits outside the pack (`.agents/skills/comparison/`):

  | Skill | When to use |
  |---|---|
  | `comparison` | Generate a package comparison doc vs competitors |

  ## Response protocol

  After any substantive work (used a skill, edited files, ran commands, made a decision), state a one-sentence handoff gate: name the skill the work hands off to (if any) and justify in one clause why it fits this request. The target is judgment-based — any skill can be the right answer depending on what the request surfaced. Mandatory — silently skipping the gate is the same as skipping a verification step.

  | Condition | Action |
  |---|---|
  | Skill loop completed with friction | Offer `brain-feedback` |
  | Non-obvious decision made (affects future runs, not already in a durable file) | Offer `brain-memory` handoff |
  | Actionable change surfaced (bug, gap, needed edit) | Offer `brain-plan` to scope the fix |
  | Multiple | Offer each, each labeled and justified |
  | None (trivial, clean run, mid-loop) | Say "nothing to hand off" and finish |

  Decide critically, not reflexively — a clean loop with zero friction skips feedback. `brain-feedback` self-calibrates this trigger each run (was the timing right?), feeding adjustments back through the normal proposal loop.

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

  - `.agents/skills/` — (the `brain-*` pack: 10 vendored skills) + `comparison/` (standalone). See §Skills.
  - `.changeset/` — changeset config
  - `.github/` — `workflows/` (CI + release), git hooks (`post-commit` → sync, `commit-msg` → commitlint), generated `instructions/` + `copilot-instructions.md`
  - `docs/` — Astro documentation website (imports package docs from `packages/*/docs/`)
  - `examples/` — `bench`, `blog`, `counter`, `theme-switcher`, `todo`
  - `guides/` — style guides (see above)
  - `memory/` — progressive-disclosure knowledge base: `entries/*.md` are canonical (frontmatter + TL;DR + Why + Evidence), `INDEX.md` is derived (regenerated by `memory.py` at `.agents/skills/brain-memory/memory.py`; never hand-edited), `archive/` holds retired entries. `brain-memory` is the single writer; all other skills read.
  - `packages/` — the six workspaces
  - `plans/` — agent-generated plan contracts: `plans/<package>/<category>/<topic>.md` (categories observed: `code`, `docs`, `misc`)
  - `plugins/` — `babel`, `rollup`, `vite`
  - `scripts/` — build/CI automation (`bundle`, `clean`, `coverage`, `release`, `sync`, `visibility`) + `utils/` + `bundle/` pipeline; see `scripts/AGENTS.md` and `guides/scripts.md`
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

  Tests run under HappyDOM via a preload (`utils/happydom.js`, configured in `bunfig.toml`). Reactive primitives (`signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`) import from `@hellajs/core`. `onError` imports from `@hellajs/dom/bundle`. Test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) import from `@utils/test-helpers.js`. Track call counts with `mock()` from `bun:test`.

  **NEVER run `bun test` directly.** All tests import from `dist/` bundles. `bun test` does NOT rebuild `dist/` — it silently tests against stale code. Always run `bun coverage <package>` (bundle + coverage + lint). CI runs `bun coverage`. `bun coverage` is the single verification gate — never list standalone `bun lint` or `bun test` in a plan's DoD when it is present.

  Coverage instruments built bundles (`dist/bundle.js`, `dist/index.js`, `plugins/**/*.mjs`), not `lib/` source — `lib/` is the truth; the bundle is the measurement target. See `guides/tests.md` for the full rules (anti-patterns, structure, the scenario → `test()` derivation, the verification checklist).
</hellajs-agent>
