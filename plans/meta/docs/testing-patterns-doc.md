# [ ] testing-patterns-doc

## Contract

### Surface change
no — no package `index.ts` barrel is touched; this plan creates one user-facing learn page. Non-package work is Surface change: `no` by definition.

### Package
meta — cross-cutting user-facing doc; not a package workspace (no `index.ts`).

### Guide governance
- Files ← `docs.md` §Pattern Docs (Pattern template: `###` per pattern, self-contained code with imports, no `## API`/`## Basic Usage`), §Frontmatter (website pages carry `title`/`description`/`layout`), §Template Selection
- Doc placement ← `docs.md` §Pattern Docs

### Files
- `docs/src/pages/learn/patterns/testing.mdx` — create — STANDALONE Pattern-doc page (mirrors `docs/src/pages/learn/quick-start.mdx` as a standalone learn page — cross-cutting, no single package owns it, so unlike a package wrapper it carries its own content rather than importing a package doc). Pattern template from `docs.md` §Pattern Docs. Frontmatter: `title`, `description`, `layout: ../../../layouts/MainLayout.astro`.   Five `###` patterns:
  - **Isolate tests with `resetTestState`** — the `beforeEach` recipe composing each package's `reset*()` nuke (`resetDom`, `resetCss`, `resetCssVars`, `resetResource`, `resetRouter`), noting store needs no global reset (per-instance `cleanup()`).
  - **Drain the DOM microtask** — `await Promise.resolve()` after DOM mutations (replaces a former `tick` helper); real time via `await new Promise(r => setTimeout(r, ms))`.
  - **Drive lifecycle synchronously** — `const app = mount(…); app.flush(); app.unmount();`.
  - **Assert with `flush`** — `import { flush } from "@hellajs/core"` for synchronous reactive propagation.
  - **Suppress console errors** — inline `suppressConsole`-style snippet for tests that assert error behavior.

  Every snippet imports from the owning package (`@hellajs/core`, `@hellajs/dom`, `@hellajs/css`, …), never from internal paths. Per `docs.md`: no test-framework assertions in examples (use comments / `console.log`).

### Tests view
No impact. The created file is a user-facing `.mdx` learn page, not source under `packages/*/lib/`; `tests.md` §Files governs `packages/*/tests/**` named after a public surface. No `test()` applies. (The page documents testing, but is itself a website doc.)

### Docs view
This plan IS the docs task — a single user-facing testing doc at `docs/src/pages/learn/patterns/testing.mdx` covering the HellaJS testing setup (imports, the reset nukes, the microtask idiom, the mount handle) for end users. Per `docs.md` §Pattern Docs (Pattern template), §Frontmatter (title/description/layout).

---

## [ ] Add cross-cutting testing patterns doc
**Type:** Docs
**Depends on:** None

### Strategy
Cross-PLAN dependencies (NOT intra-file `Depends on:`): the test-harness explicit-import migration must land first (so the snippets show real imports + the real `resetTestState` orchestrator), and the dom reset + mount handle plan must land first (so the `mount().flush()/.unmount()` snippet shows a real lifecycle). The page is STANDALONE — cross-cutting, no single package owns it — so it carries its own content rather than importing a package doc; this mirrors `docs/src/pages/learn/quick-start.mdx` as a standalone learn page. Pattern template (`docs.md` §Pattern Docs): one `###` per pattern, every code block self-contained with imports, no `## API`/`## Basic Usage`. The five patterns are the irreducible testing surface: isolation (`resetTestState` + per-package nukes), microtask drain (`await Promise.resolve()`), lifecycle drive (mount handle), synchronous assertion (`flush`), console suppression. Every snippet imports from public barrels (`@hellajs/core`, `@hellajs/dom`, `@hellajs/css`, …), never internal paths, and uses no test-framework assertions (comments / `console.log` only) per `docs.md`. Trade-off considered and rejected: a package-wrapper page (one per package) — testing is cross-cutting by nature, so per-package pages would fragment the mental model and duplicate the `resetTestState` orchestrator across five places; one standalone page is clearer (Correctness/Clarity over Brevity).

### Definition of Done
- [ ] Every code example in `testing.mdx` compiles against current source signatures and imports only from public package barrels
- [ ] The Pattern Doc template from `./guides/docs.md` is used (`###` per pattern, self-contained code with imports, no `## API`/`## Basic Usage`)
- [ ] The file has frontmatter with `title`, `description`, and `layout`
- [ ] No claim contradicts the implementation — cross-checked against the `reset*` exports, `mount.ts`, and `utils/test-helpers.ts`
- [ ] The file lives at `docs/src/pages/learn/patterns/testing.mdx` (standalone, not a package wrapper)
