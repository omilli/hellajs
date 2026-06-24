# [ ] api-reference-pages

## Contract

### Surface change
no — no package `index.ts` barrel is touched; this plan adds/renames API-reference doc pages and their website wrappers. Non-package work is Surface change: `no` by definition.

### Package
meta — cross-cutting reference-doc ownership across packages; not a package workspace (no `index.ts`).

### Guide governance
- Files ← `docs.md` §File Locations & Naming (lowercase filenames match export names), §Frontmatter (package docs have none; website wrappers carry `title`/`description`/`layout`)
- Doc placement ← `docs.md` §Function & Prefix Docs (Function template for every reset/remove page + `flush`), §Template Selection

### Files
- `packages/resource/docs/api/resetresource.mdx` — create — Function template; `# resetResource`; `## API` signature; self-contained `## Basic Usage`; `## Key Concepts` covering real-world nuke use cases (HMR, session reset, logout, error recovery, testing) + explicit note on which state it clears (vs `resourceCache.invalidateAll`).
- `docs/src/pages/reference/resource/resetresource.mdx` — create — website wrapper with `title`/`description`/`layout`.
- `packages/router/docs/api/resetrouter.mdx` — create — Function template; `# resetRouter`; same `## Key Concepts` shape (nuke use cases + cleared-state note; URL is NOT touched).
- `docs/src/pages/reference/router/resetrouter.mdx` — create — website wrapper.
- `packages/dom/docs/api/resetdom.mdx` — create — Function template; `# resetDom`; `## Key Concepts` noting it clears error handlers + scoped observer state.
- `docs/src/pages/reference/dom/resetdom.mdx` — create — website wrapper.
- `packages/core/docs/api/flush.mdx` — create — Function template; `# flush` (already exported by `@hellajs/core`, currently undocumented — an orphan page); `## Basic Usage` with `import { flush } from "@hellajs/core"`.
- `docs/src/pages/reference/core/flush.mdx` — create — website wrapper.
- `packages/css/docs/api/cssreset.mdx` → `resetcss.mdx` — rename — `# cssReset` → `# resetCss`; fix every cross-reference.
- `packages/css/docs/api/cssvarsreset.mdx` → `resetcssvars.mdx` — rename — same.
- `packages/css/docs/api/cssremove.mdx` → `removecss.mdx` — rename — same.
- `packages/css/docs/api/cssvarsremove.mdx` → `removecssvars.mdx` — rename — same.
- `docs/src/pages/reference/css/{cssreset,cssvarsreset,cssremove,cssvarsremove}.mdx` → `{resetcss,resetcssvars,removecss,removecssvars}.mdx` — rename — website wrappers matching new slugs.
- `packages/dom/docs/api/mount.mdx` — modify — document the `MountHandle` return (`container`, `flush()`, `unmount()`): a method-style `###` block under `## Key Concepts` (or `## API` if the return type warrants) with a usage example `const app = mount(…); app.flush(); app.unmount();`.

### Tests view
No impact. The touched files are `.mdx` doc pages + wrappers, not source under `packages/*/lib/`; `tests.md` §Files governs `packages/*/tests/**` named after a public surface. No `test()` applies.

### Docs view
This plan IS the docs task — every new/renamed public symbol gets an API-reference page matching its export name, and `mount.mdx` documents the lifecycle handle. Per `docs.md` §Function & Prefix Docs (Function template) and §File Locations & Naming (lowercase, matches export name).

---

## [ ] Add and rename API-reference pages for resets and the mount handle
**Type:** Docs
**Depends on:** None

### Strategy
Cross-PLAN dependencies (NOT intra-file `Depends on:`): the css rename (`plans/css/code/css-rename.md`), resource reset, router reset, and dom reset + mount handle plans must all land first — their exports are what these pages document. Per `docs.md` §Function & Prefix Docs: Function template, no frontmatter on package docs; website wrappers carry `title`/`description`/`layout`; `# Title` matches the export name; `## API` signature + self-contained `## Basic Usage` with imports. Each new reset page documents the real-world nuke use cases (HMR, session reset, logout, error recovery, testing) in `## Key Concepts` and explicitly notes which state it clears (so users know what `resetResource` covers vs `resourceCache.invalidateAll`, and that `resetDom` clears error handlers). Coordination/ownership: per-package trio Docs tasks own their own `docs/index.mdx` API lists; THIS plan owns the standalone `packages/*/docs/api/*.mdx` reference page FILES (no duplication). `mount.mdx` lives HERE; the dom-reset trio's Docs task owns `packages/dom/docs/index.mdx` list only and defers to this plan for the page. Trade-off considered and rejected: splitting each package's new pages into that package's trio Docs task — would scatter standalone-page authorship and duplicate the Function-template reasoning across five plans; a single owner is clearer (Correctness/Clarity over Brevity).

### Definition of Done
- [ ] Every code example in the changed/added `.mdx` files compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` is used for every new/changed API page
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter; website wrappers (`docs/src/pages/**/*.mdx`) have `title`, `description`, `layout`
- [ ] No claim contradicts the implementation — each reset's stated cleared-state cross-checked against its source; the mount handle cross-checked against `mount.ts`
- [ ] Every new/renamed file name matches its export name (lowercase): `resetresource`, `resetrouter`, `resetdom`, `flush`, `resetcss`, `resetcssvars`, `removecss`, `removecssvars`
