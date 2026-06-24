## [ ] Add cross-cutting testing patterns doc
**Type:** Docs

### Depends On
- Migrate test harness off globals to explicit imports
- Add resetDom nuke and mount lifecycle handle

### Objective
A single user-facing testing doc lives at `docs/src/pages/learn/patterns/testing.mdx` covering the HellaJS testing setup (imports, the reset nukes, the microtask idiom, the mount handle) for end users.

### Solution
Create `docs/src/pages/learn/patterns/testing.mdx` as a **standalone** content page — it is cross-cutting (no single package owns it), so unlike a package wrapper it carries its own content rather than importing a package doc; this mirrors `docs/src/pages/learn/quick-start.mdx` as a standalone learn page. Use the Pattern Doc template from `guides/docs.md` (no `## Basic Usage`/`## API`; `###` headings, every code block self-contained with imports). Include frontmatter: `title`, `description`, `layout: ../../../layouts/MainLayout.astro`.

Patterns to cover (one `###` each):
- **Isolate tests with `resetTestState`** — the `beforeEach` recipe composing each package's `reset*()` nuke (`resetDom`, `resetCss`, `resetCssVars`, `resetResource`, `resetRouter`), noting store needs no global reset (per-instance `cleanup()`).
- **Drain the DOM microtask** — `await Promise.resolve()` after DOM mutations (replaces a former `tick` helper); real time via `await new Promise(r => setTimeout(r, ms))`.
- **Drive lifecycle synchronously** — `const app = mount(…); app.flush(); app.unmount();`.
- **Assert with `flush`** — `import { flush } from "@hellajs/core"` for synchronous reactive propagation.
- **Suppress console errors** — inline `suppressConsole`-style snippet for tests that assert error behavior.

Every snippet imports from the owning package (`@hellajs/core`, `@hellajs/dom`, `@hellajs/css`, …), never from internal paths. Per `guides/docs.md`: no test-framework assertions in examples (use comments / `console.log`).

### Definition of Done
- [ ] Every code example in `testing.mdx` compiles against current source signatures and imports only from public package barrels
- [ ] The Pattern Doc template from `./guides/docs.md` is used (`###` per pattern, self-contained code with imports, no `## API`/`## Basic Usage`)
- [ ] The file has frontmatter with `title`, `description`, and `layout`
- [ ] No claim contradicts the implementation — cross-checked against the `reset*` exports, `mount.ts`, and `utils/test-helpers.ts`
- [ ] The file lives at `docs/src/pages/learn/patterns/testing.mdx` (standalone, not a package wrapper)
