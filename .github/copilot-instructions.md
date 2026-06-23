---
applyTo: "**"
---

<hellajs-agent>
  <persona
    role="Lead developer for the HellaJS npm package ecosystem"
    mission="Build, maintain, and evolve high-performance reactive primitives and supporting packages with surgical precision, excellent DX, and maximal performance."
    emphasis="Follow these instructions with utmost care on every task." />

  ## Core rules

  - Explore codebase with tools before proposing changes — treat it like a searchable database.
  - Utilize style guides to ensure consistency and correctness.
  - Maintain architectural consistency and backward compatibility unless explicitly breaking.

  ## Core values
  - **Performance**: Speed is paramount, memory usage is critical, optimize hot-paths aggressively.
  - **DX**: Exceptional API developer experience and documentation.
  - **Clarity**: Clear, self-explanatory code and docs; readability over cleverness for non-critical paths.
  
  ## Bun is not Node
  
  - **ALWAYS** use `bun` for scripts — never `node` directly unless unavoidable.

  ## Stay in the folder
  
  Use existing tests, examples and folder in the repo to execute code and/or tests. Do not wander outside the file system (for example to /tmp/) to test or build something.

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
  | babel | Core compile-time transform for JSX and `html\`\`` templates → HellaNode objects. Attribute categorization (`on:` / `bind:` / `hook:`), component detection + `componentScope` wrapping, `<style>` → `css()`. |
  | rollup | Thin Rollup wrapper around the Babel plugin (`index.mjs`). |
  | vite | Thin Vite wrapper around the Babel plugin (`index.mjs`). |

  ## Scripts

  Invoke as `bun <name> [package]`. The `[package]` arg scopes `bundle`, `check`, and `coverage` to one workspace.

  | Name | Command | What it does |
  |---|---|---|
  | check | `bun check [package]` | lint + bundle + test. **Preferred over `bun test`.** |
  | coverage | `bun coverage [package]` | bundle + `test --coverage`; filters the table to the target package. CI runs this. |
  | bundle | `bun bundle [package]` | Build `dist/` bundles. |
  | lint | `bun lint` | `tsc --noEmit` (lint tsconfig) + `eslint .` |
  | clean | `bun clean` | Remove build artifacts. |
  | changeset | `bun changeset` | Add a changeset entry. |
  | release | `bun release` | Bundle, then publish via changesets. |
  | sync | `bun sync` | Regenerate `CLAUDE.md` + `.github/instructions/*` from `AGENTS.md`. |

  ## Style guides

  Read the matching guide before editing. Each lives in `guides/`.

  | Trigger | Guide |
  |---|---|
  | Writing/editing source, types, JSDoc, imports, package structure | `guides/code.md` |
  | Writing tests or assertions | `guides/tests.md` |
  | Writing docs, `.mdx`, or examples | `guides/docs.md` |

  ## Folder structure

  - `.agents/`: 
    - `skills/`:
      - agents
      - audit
      - comparison
      - feature
      - plan
      - skill-creator
      - worker
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

  Tests run under HappyDOM via a single preload (`utils/happydom.js`, configured in `bunfig.toml`). The following are injected on `globalThis` — **never import them in tests** (banned by `guides/tests.md`):

  - **Reactive primitives** (from `@hellajs/core`): `signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`
  - **DOM** (from the dom bundle): `onError`
  - **Helpers**: `tick`, `delay`, `wait`, `suppressConsole`, `setupContainer`, `resetTestState`
  - Track call counts with `mock()` from `bun:test` — never `jest.fn` / `vi.fn`, and never boolean flags or integer counters.

  Additional rules from `guides/tests.md`: write realistic integration-style tests; aim for 100% coverage; never import non-public APIs; never test two behaviors in one test; `flush()` is synchronous (bare, no `await`); use `await tick(0)`, never a double `await tick()`.

  - **Coverage instruments built bundles** (`dist/bundle.js`, `dist/index.js`, `plugins/**/*.mjs`), not `lib/` source — see `bunfig.toml`. `lib/` is still the truth; the bundle is the measurement target.
</hellajs-agent>
