# [ ] css-rename

## Contract

### Surface change
yes — renames four symbols re-exported by `packages/css/lib/index.ts` (`cssReset`, `cssVarsReset`, `cssRemove`, `cssVarsRemove`); their filenames change too. Per `code.md` §index.ts Rules and §Package File Structure, a renamed re-export is a surface change.

### Package
css

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`reset<Package>` / `remove<Package>` verb-first convention)
- Public API delta ← `code.md` §`index.ts` Rules, §Naming Conventions › Functions
- Behavioral scenarios ← `tests.md` §Shared State and Cleanup (`beforeEach` with `resetTestState()` + the css resets), §Test Structure
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs

### Files
- `packages/css/lib/cssReset.ts` → `packages/css/lib/resetCss.ts` — rename — exported function `cssReset` → `resetCss` (verbatim implementation/JSDoc)
- `packages/css/lib/cssVarsReset.ts` → `packages/css/lib/resetCssVars.ts` — rename — `cssVarsReset` → `resetCssVars`
- `packages/css/lib/cssRemove.ts` → `packages/css/lib/removeCss.ts` — rename — `cssRemove` → `removeCss`
- `packages/css/lib/cssVarsRemove.ts` → `packages/css/lib/removeCssVars.ts` — rename — `cssVarsRemove` → `removeCssVars`
- `packages/css/lib/index.ts` — modify — the four re-exports swap to the new names + new source paths
- `packages/css/tests/*.test.ts` — modify — every `cssReset`/`cssVarsReset`/`cssRemove`/`cssVarsRemove` reference (import + call site, especially the `beforeEach` composition documented in the css AGENTS.md Testing section)
- `packages/css/AGENTS.md` — modify — exports table: rename the four entries (`cssReset`→`resetCss`, `cssVarsReset`→`resetCssVars`, `cssRemove`→`removeCss`, `cssVarsRemove`→`removeCssVars`) + every inline mention; the regenerated `CLAUDE.md` mirror + `.github/instructions/*` are produced by `bun sync` after this edit
- `packages/css/docs/api/cssreset.mdx` → `resetcss.mdx` — rename — `# cssReset` → `# resetCss`, every cross-reference
- `packages/css/docs/api/cssvarsreset.mdx` → `resetcssvars.mdx` — rename — same
- `packages/css/docs/api/cssremove.mdx` → `removecss.mdx` — rename — same
- `packages/css/docs/api/cssvarsremove.mdx` → `removecssvars.mdx` — rename — same
- `packages/css/docs/index.mdx` — modify — API list: four renamed entries + link targets
- `docs/src/pages/reference/css/{cssreset,cssvarsreset,cssremove,cssvarsremove}.mdx` — rename wrappers — match new slugs

### Public API delta
```ts
// packages/css/lib/index.ts — before
export { cssRemove } from "./cssRemove";
export { cssReset } from "./cssReset";
export { cssVarsRemove } from "./cssVarsRemove";
export { cssVarsReset } from "./cssVarsReset";

// after
export { removeCss } from "./removeCss";
export { resetCss } from "./resetCss";
export { removeCssVars } from "./removeCssVars";
export { resetCssVars } from "./resetCssVars";
```

```ts
import { resetCss, resetCssVars, removeCss, removeCssVars } from "@hellajs/css";

resetCss();              // nuke all css rules + the 4 css-side in-memory maps + reset hella-css sheet
resetCssVars();          // dispose all vars effects + clear vars maps + reset hella-vars sheet
removeCss("btn");        // decrement refCount; at zero drop the scope's CSSOM rules + cache entry
removeCssVars(varsRef);  // reactive-first (by ref) then static (by hash) removal; at zero dispose effect
```

### Behavioral scenarios
- `resetCss()` clears css-side state and the `hella-css` sheet (behavior unchanged from `cssReset`) — pinned by existing css reset assertions
- `resetCssVars()` disposes all vars effects and clears vars state (behavior unchanged from `cssVarsReset`)
- `removeCss(name)` decrements refCount and tears down at zero (behavior unchanged from `cssRemove`)
- `removeCssVars(ref)` removes one registration and disposes its effect at zero (behavior unchanged from `cssVarsRemove`)

### Doc placement
- `packages/css/docs/api/resetcss.mdx` — Function template — title + `## API` + `## Basic Usage` — rename of `cssreset.mdx`
- `packages/css/docs/api/resetcssvars.mdx` — Function template — rename of `cssvarsreset.mdx`
- `packages/css/docs/api/removecss.mdx` — Function template — rename of `cssremove.mdx`
- `packages/css/docs/api/removecssvars.mdx` — Function template — rename of `cssvarsremove.mdx`
- `packages/css/docs/index.mdx` — Index — API bullet list — four entries relinked to the new slugs
- `docs/src/pages/reference/css/{resetcss,resetcssvars,removecss,removecssvars}.mdx` — website wrappers — rename + slug update

### Tests view
Update existing css tests (`css.test.ts`, `cssvars.test.ts`, `cssvars-remove.test.ts`, `ssr.test.ts`) to import and call the four new names — especially the `beforeEach` reset composition. No new `test()`s; the four Behavioral scenarios above are already asserted by the existing suite under the old names. Per `tests.md` §Files (surface-named test files) and §Shared State and Cleanup.

### Docs view
Rename the four API doc pages + their website wrappers so the file name matches the new export name (`docs.md` §File Locations & Naming — lowercase, matches export); update `packages/css/docs/index.mdx` API list and every internal cross-reference. This trio owns the full blast radius: the standalone reference pages AND the `packages/css/AGENTS.md` exports-table rename of the four entries (the regenerated `CLAUDE.md` mirror + `.github/instructions/*` are produced by `bun sync` after the AGENTS.md edit). No meta coordination plan is cited — each feature plan owns its symbol's full surface.

---

## [ ] Rename the css reset/remove family (Code)
**Type:** Code
**Depends on:** None

### Strategy
Verb-first `reset<Package>` / `remove<Package>` is the project-wide convention (matches `resetDom`, `resetRouter`, `resetResource` from the sibling reset plans). Rename each of the four files to its new path, rename the exported function, keep the implementation and JSDoc verbatim — this is a pure rename, no logic change, so Correctness and Backward-compat-as-documentation are served by touching nothing inside the function bodies. Update `lib/index.ts` re-exports to the four new names and source paths. The babel plugin's `<style>` → `css()` transform targets `css()` (unchanged), so no plugin ripple. Trade-off considered and rejected: keeping deprecated re-exports under the old names — would violate the single-source-of-truth `index.ts` rule (`code.md` §`index.ts` Rules) and the rename's whole purpose (aligning with the cross-package convention).

### Definition of Done
- [ ] `bun check css` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched/renamed as specified — no `cssReset.ts`/`cssVarsReset.ts`/`cssRemove.ts`/`cssVarsRemove.ts` remain under `lib/`
- [ ] Public API delta in Contract implemented verbatim — `lib/index.ts` re-exports the four new names from the four new source paths
- [ ] Every renamed exported symbol keeps its JSDoc (all four are re-exported by `index.ts`, so no `@internal`)
- [ ] No new runtime dependency
- [ ] A changeset exists at `.changeset/*.md` declaring `major` for `@hellajs/css` (four public symbols renamed — breaking)
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on the four renamed files + `lib/index.ts` reports no deviations from `./guides/code.md`

## [ ] Update css tests to the renamed symbols (Tests)
**Type:** Tests
**Depends on:** Rename the css reset/remove family

### Strategy
Pure symbol swap across the existing suite — no new behavior to cover (the four Behavioral scenarios are already asserted under the old names). Update import specifiers and call sites in every test file that references `cssReset`/`cssVarsReset`/`cssRemove`/`cssVarsRemove`, paying special attention to the `beforeEach` reset composition (`resetTestState()` + `cssReset()` + `cssVarsReset()` per the css AGENTS.md Testing section). `ssr.test.ts`'s `cssReset`/`cssVarsReset` calls under the `globalThis.document = undefined` bracket update too. Per `tests.md` §Shared State and Cleanup, the reset composition stays in `beforeEach`, not duplicated per test.

### Definition of Done
- [ ] `bun check css` exits 0
- [ ] `bun coverage` shows no drop in css coverage (renamed symbols are still exercised)
- [ ] No bare reference to `cssReset`/`cssVarsReset`/`cssRemove`/`cssVarsRemove` remains in `packages/css/tests/**`
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test still asserts a behavior the source exposes — cross-checked against the renamed implementation

## [ ] Rename css API docs + wrappers (Docs)
**Type:** Docs
**Depends on:** Rename the css reset/remove family

### Strategy
Per `docs.md` §File Locations & Naming, the API doc file name matches the export name (lowercase, no separator) — so each renamed export forces a renamed `.mdx` and website wrapper. Rename the four package doc pages and four wrapper pages, update the `# Title` to the new export name, and fix every internal cross-reference (the `docs/index.mdx` API list links + any `## Key Concepts` callouts in `css.mdx`/`cssvars.mdx` that mention the reset/remove siblings). The Function template (`docs.md` §Function & Prefix Docs) still governs each page; only identifiers and file names change, not structure. This trio also owns the `packages/css/AGENTS.md` exports-table rename of the four entries + every inline mention, then runs `bun sync` to regenerate the `CLAUDE.md` mirror + `.github/instructions/*` — the symbol's AGENTS.md entry is part of its blast radius, not a meta-plan concern.

### Definition of Done
- [ ] Every code example in the changed/renamed `.mdx` files compiles against the current (renamed) source signatures
- [ ] The Function Doc template from `./guides/docs.md` is preserved on each page
- [ ] Package docs (`packages/css/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against the renamed source and tests
- [ ] Every new/renamed file name matches its export name (lowercase): `resetcss`, `resetcssvars`, `removecss`, `removecssvars`
- [ ] `packages/css/docs/index.mdx` API list links point at the new slugs; no stale `cssreset`/`cssvarsreset`/`cssremove`/`cssvarsremove` references remain
- [ ] `packages/css/AGENTS.md` exports table renames the four entries; no stale `cssReset`/`cssVarsReset`/`cssRemove`/`cssVarsRemove` mention remains; `bun sync` regenerates `CLAUDE.md` + `.github/instructions/*`
