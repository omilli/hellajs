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

  The discovery → plan → worker loop: `feature` / `audit` (discovery) hand off an evidence map to `plan`, which derives a Contract from the guides and writes typed tasks; `worker` executes with structural gates. When a skill hits a guide conflict it emits a guide-update proposal; `guide` executes the accepted edit. `feedback` runs after any skill execution to conservatively propose skill improvements — the self-improvement loop. Each skill's `SKILL.md` carries the full workflow and the two Non-negotiables with skill-specific enforcement.

  | Skill | When to use |
  |---|---|
  | feature | Brainstorm or surface grounded feature ideas for a package, then hand off to plan |
  | audit | Review, grade, or critique files against the guides |
  | comparison | Generate a package comparison doc vs competitors |
  | plan | Plan, break down, or scope work into typed tasks with a Contract and DoD |
  | worker | Execute a plan document task by task |
  | instructions | Rebuild an AGENTS.md truth-grounded from `lib/` |
  | guide | Apply a guide update after a proposal is accepted; verify generality + blast radius |
  | feedback | Run after any skill execution; conservatively propose skill edits on friction |

  ## Style guides

  Read the matching guide before editing. Each lives in `guides/` and is structured as a decision procedure: decision trees + canonical paths + canonical examples at the top, the rules in the middle, and a verification checklist at the end. Read the relevant section, not the whole file.

  | Trigger | Guide |
  |---|---|
  | Writing/editing source, types, JSDoc, imports, package structure | `guides/code.md` |
  | Writing tests or assertions | `guides/tests.md` |
  | Writing docs, `.mdx`, or examples | `guides/docs.md` |

  ## Folder structure

  - `.agents/skills/` — `feature`, `audit`, `comparison`, `plan`, `worker`, `instructions`, `guide`, `feedback` (see Skills above)
  - `.changeset/` — changeset config
  - `.github/` — `workflows/` (CI + release), git hooks (`post-commit` → sync, `commit-msg` → commitlint), generated `instructions/` + `copilot-instructions.md`
  - `docs/` — Astro documentation website (imports package docs from `packages/*/docs/`)
  - `examples/` — `bench`, `blog`, `counter`, `theme-switcher`, `todo`
  - `guides/` — style guides (see above)
  - `packages/` — the six workspaces
  - `plugins/` — `babel`, `rollup`, `vite`
  - `scripts/` — build/CI automation (`bundle`, `check`, `clean`, `coverage`, `release`, `sync`) + `utils/`
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
