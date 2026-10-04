<docs-site-instructions>

  Astro static docs site (`@hellajs/docs`, `docs/`). Independent package — **not** a root bun workspace (root workspaces are `packages/*` + `plugins/*`), with its own `bun.lock` + `package.json`, built by `astro` (never root `bun bundle`/`coverage`/`clean`, which ignore it). A thin presentation layer: page wrappers under `src/pages/` import the real content from `packages/*/docs/` via Vite aliases. Editing a wrapper changes layout/frontmatter only — visible prose lives in the package doc. `package.json` declares no `@hellajs/*`: runtime imports (`src/demos/` island modules, `@registry/*` files, astro inline `<script>`s) resolve via root `node_modules` walk-up — `docs/node_modules` holds no `@hellajs` and `docs/bun.lock` has zero `@hellajs` entries; keep it that way (never add `@hellajs/*` deps or overrides, never `bun add` into `docs/`).

  ## Architecture

  - **Three page kinds**: (1) *wrapper* pages (`learn/concepts/*`, `reference/{pkg}/*`) — frontmatter + `layout` + `import X from '@pkg/…'` + `<X />`; content is external. (2) *self-contained* pages (`pages/plugins/*`, `learn/quick-start.mdx`, landing, `pages/ui/<name>.astro`) — prose written inline; the ui pages are `.astro` (`Demo` cards with `client:load` islands + the `@ui/concepts/<name>.mdx` import), not mdx. (3) *enumeration* pages (`learn/index.mdx`, `learn/patterns/index.mdx`, `reference/index.mdx`, `ui/index.mdx`) — hand-maintained link lists.
  - **Content aliases** — `@core` / `@css` / `@dom` / `@resource` / `@router` / `@store` → `../packages/<pkg>/docs/*`, plus `@components/*` → `./src/components/*` (the Callout import for package docs + tutorials), `@registry/*` → `../packages/ui/dist/registry/*` (the ui demos' build-output alias; needs `bun bundle ui`) + `@examples/*`. Defined in **two** places (`astro.config.mjs` `vite.resolve.alias` + `tsconfig.json` `compilerOptions.paths`); keep both in sync when adding a package or alias.
  - **Styling** — zero utility framework: site styles are `css()`/`style()` modules (`src/styles/`, `src/chrome/chrome-css.ts`) collected into the layout head via `cssText()`; `src/global.css` holds plain CSS only (font face, landing stopgap, demo harness). Registry components run on the registry's own style modules + `src/styles/tokens.ts` overrides.
  - **Nav** — `nav.ts` is the single source of truth; `src/chrome/DocsNav.astro` consumes it as pure data and renders the tree server-side (no client JS). Four top-level sections: `learn` (Quick-Start + Concepts/Patterns/Tutorials groups), `reference` (per-package), `plugins`, `ui`.
  - **Search** — `astro-pagefind` builds the index; the palette (`src/chrome/SearchPalette.tsx`, a `CommandDialog` island) queries it through pagefind's JS API lazily on first open. Rebuild (`astro build`) before verifying search results; dev has no index.

  ## Files

  | Path | Responsibility |
  |---|---|
  | `astro.config.mjs` | Integrations (`astro-icon`, `@astrojs/mdx`, `astro-pagefind`, `astro-plugin-hellajs`) + the seven `@<pkg>` Vite aliases + `@components` + `@registry` + `@examples`. No vite plugins. |
  | `tsconfig.json` | `astro/tsconfigs/strict` + `compilerOptions.paths` mirroring the Vite aliases. |
  | `package.json` | `dev` / `build` / `preview` / `astro` scripts. No `@hellajs/*` and no utility-framework deps. |
  | `src/nav.ts` | Nav tree + its types (`NavLeaf`/`NavGroup`/`NavSection`/`NavTreeNode`); entry forms below. |
  | `src/global.css` | Plain CSS only: Mulish `@font-face`, `.pkg-badge-row`, landing stopgap styles (`.landing-*`), `.ti-cursor`, demo harness (`.demo-*` on tokens.ts names). |
  | `src/styles/tokens.ts` | Site tokens on the registry vocabulary (`vars()`): palette port, base ladder, `sidebar-*` overrides. Unlayered at `html:root` specificity (`scoped: "html:root"` — 0,1,1 beats every registry `:root` (0,1,0) registration regardless of order; island hydration registers the registry sheet client-side after the static head and loses on specificity; the palette probe over `astro preview` guards this). |
  | `src/styles/prose.ts` | `css()` typography ruleset under `main` (headings through code blocks, tables, lists); the only `!important` beats shiki's inline pre background. |
  | `src/styles/callouts.ts` | `style()` mirror of the registry alert's base/body/title chrome + site `info`/`warning`/`error` variants (values port the retired daisy looks). |
  | `src/components/Callout.astro` | Docs callout component (`variant="info|warning|error"`), `role="alert"` always; consumed by package docs + tutorials via `@components/Callout.astro`. |
  | `src/layouts/MainLayout.astro` | Docs layout: `Navbar` + `DocsNav` + `Toc` + `SearchPalette`; renders the default slot in frontmatter to lift h2/h3 into the server-rendered TOC; inlines `cssText()` as a plain `<style is:inline>` (no id — the css runtime injects client-side registrations into its own `#hella-css` element; this static tag stays separate). |
  | `src/layouts/LandingLayout.astro` | Landing-only layout (no navbar/nav); OG/Twitter meta; plain markup — global.css paints the body. |
  | `src/chrome/Navbar.astro` | Static top bar: logo, section links, search trigger (`data-command-open`), GitHub link, drawer toggle. Zero client JS. |
  | `src/chrome/DocsNav.astro` + `NavNode.astro` | Server-rendered nav tree from `nav.ts` (drawer below lg, persistent rail at lg+). |
  | `src/chrome/Toc.astro` | Server-rendered "On This Page" (mobile top + desktop rail) from the layout's slot-render lift. |
  | `src/chrome/SearchPalette.tsx` | Command-palette island: `CommandDialog` + pagefind JS API (lazy first-open query, seq-guarded); ⌘K binding; opens from the navbar trigger. |
  | `src/chrome/chrome-css.ts` | `css()` chrome module (nav shell, drawer, topbar, search command width, toc) — imported by MainLayout for the head tag. |
  | `src/components/Badge.astro` | npm version shield for a package (`package` prop); row layout via `.pkg-badge-row`. |
  | `src/components/CodeExample.mdx` | Static hero code block for the landing page. |
  | `src/utils/demo-code.ts` | Demo source extractor: slices each demo card's View Code export block out of the island's `?raw` source. |
  | `src/pages/index.astro` | Landing page (`LandingLayout`). |
  | `src/pages/learn/**` | `quick-start.mdx` + `concepts/` + `patterns/` + `tutorials/` — ALL are thin wrappers; content lives in `packages/*/docs/` (concepts/patterns) and `examples/{name}/tutorial.mdx` (tutorials). |
  | `src/pages/reference/{pkg}/**` | One wrapper page per exported symbol; imports `@<pkg>/api/<symbol>.mdx`. |
  | `src/pages/plugins/{babel,rollup,vite}.mdx` | Self-contained install/config guides (no package-doc import). |
  | `src/pages/ui/<name>.astro` | 59 self-contained component pages: a hero `Demo` card plus per-example `Demo` cards, each mounting an island from `src/demos/<name>-demo.tsx` via `client:load`, `InstallSection` for the four install sources, and the package-docs prose via `@ui/concepts/<name>.mdx`. |
| `src/demos/<name>-demo.tsx` | Island modules: import the component's built registry output (`@registry/<name>/css/<name>.js`) + `@registry/theme/tokens.dark.js` (site is dark-only), compose a demo with hellajs primitives, export named demo components. View Code renders this file's own source via `?raw`. Requires `bun bundle ui` first (`@registry` points into gitignored `dist/registry`). |
| `src/generated/install/<variant>/<name>.<ext>` | The four install-source variant dirs (`css-jsx/<name>.tsx`, `css-html/<name>.ts`, `tailwind-jsx/<name>.tsx`, `tailwind-html/<name>.ts`), generated byte-exact `add` output — regenerated by root `bun install-sources [entry ...]`, never hand-edited. |
  | `public/favicon.svg` | Site icon. |
  | `integrations/` | Empty placeholder. |

  ## Wrapper-page pattern

  A wrapper is exactly frontmatter + one import + one render — nothing else:

  ```mdx
  ---
  layout: ../../../layouts/MainLayout.astro
  title: Reactivity
  description: …
  ---

  import ReactivityContent from '@core/concepts/reactivity.mdx'

  <ReactivityContent />
  ```

  `layout` paths are relative from the page file (depth varies — `learn/concepts/*` is `../../../`, `reference/core/*` is `../../../`, top-level pages are `../../`). `title` feeds both `<title>` and the sidebar. To change visible content on a wrapper page, edit the imported `packages/<pkg>/docs/*.mdx` — not the wrapper.

  ## Navigation entry forms (`nav.ts`)

  | Form | Resolves to | Notes |
  |---|---|---|
  | `"Foo"` | `/section/foo`, title from `frontmatter.title` else dash→space | default; slug = lowercased string |
  | `{ label: "e:", slug: "e" }` | `/section/e`, title = `label` | used where the slug is a prefix (`e`/`on`/`bind`/`hook`/`error`) that needs a readable label |
  | `{ Concepts: [...] }` | `/section/concepts` group, expandable | group header; children recurse |

  Adding a page = add the file **and** its nav entry (or it won't appear in the sidebar). Reference pages with prefix slugs (`e`, `on`, `bind`, `hook`, `error`) must use the `{label, slug}` form.

  ## Build & dev

  Run from `docs/` (astro commands, not root scripts):

  | Command | What |
  |---|---|
  | `bun run dev` | `astro dev` — local dev server. |
  | `bun run build` | `astro build` → `dist/` (also generates Pagefind index). |
  | `bun run preview` | Serve the built `dist/`. |

  No typecheck/lint gate and no test suite for the docs site — verification is `astro build` exiting clean + visual check. TypeScript errors in `.astro`/`.tsx` surface only at build.

  ## Non-obvious behaviors

  - **"On This Page" is server-rendered** — `MainLayout.astro` renders the default slot in frontmatter and lifts h2/h3 (with their mdx slug ids) into `Toc.astro`; headings without an id are skipped. No client script, zero flash.
  - **Dark-only by tokens** — no `data-theme` attribute, no theme toggle: `src/styles/tokens.ts` registers the site palette at `html:root` specificity, which beats the registry's unlayered `:root` sheet regardless of registration order — island hydration registers client-side after the static head (the palette probe guards it).
  - **Static site, SSR docs** — packages are client-side; the site is a static `astro build` (the `ssr` package's docs describe server-side string rendering).
  - **`slug` vs `title`** — nav string entries map to URL slugs (lowercased), but the sidebar displays `frontmatter.title` when present. A page whose title casing differs from its slug still resolves correctly; only a missing/renamed *file* breaks the link.
  - **MDX is the default content format** — `DocsNav.astro` consumes `nav.ts` for the tree; `.astro` pages are not glob-discoverable, so their titles resolve from the nav entry itself (dash→space fallback — the `ui/<name>.astro` pages rely on this; the landing `index.astro` is intentionally outside the nav).

  ## Drift surface (verify on every page add/remove/rename)

  The docs site has no test catching broken internal links, so each change must manually reconcile the full surface — this is the docs-site analogue of the root "full blast radius" rule:

  - **`nav.ts` ↔ `pages/**/*.{mdx,astro}`** — every entry must resolve to a file; every sidebar-visible page needs an entry. Stale entries render dead links or fall back to dash→space titles.
  - **Enumeration pages** — `learn/index.mdx`, `learn/patterns/index.mdx`, `reference/index.mdx`, `ui/index.mdx` are hand-maintained; known to drift. Re-walk these whenever a page is added, removed, or renamed.
  - **Prose cross-references** — before changing a behavior the docs describe, grep `src/pages/` for claims the change falsifies (e.g. an "X not supported" alert a new feature makes false).
  - **Aliases** — a new package needs its `@<pkg>` alias added to **both** `astro.config.mjs` and `tsconfig.json`.

  Follow `guides/docs.md` for all `.mdx`/prose authoring; it supersedes any style hint here.
</docs-site-instructions>
