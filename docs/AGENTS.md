<docs-site-instructions>

  Astro static docs site (`@hellajs/docs`, `docs/`). Independent package — **not** a root bun workspace (root workspaces are `packages/*` + `plugins/*`), with its own `bun.lock` + `package.json`, built by `astro` (never root `bun bundle`/`coverage`/`clean`, which ignore it). A thin presentation layer: page wrappers under `src/pages/` import the real content from `packages/*/docs/` via Vite aliases. Editing a wrapper changes layout/frontmatter only — visible prose lives in the package doc. `package.json` declares no `@hellajs/*`: runtime imports (`src/demos/` island modules, `@registry/*` files, astro inline `<script>`s) resolve via root `node_modules` walk-up — `docs/node_modules` holds no `@hellajs` and `docs/bun.lock` has zero `@hellajs` entries; keep it that way (never add `@hellajs/*` deps or overrides, never `bun add` into `docs/`).

  ## Architecture

  - **Three page kinds**: (1) *wrapper* pages (`learn/concepts/*`, `reference/{pkg}/*`) — frontmatter + `layout` + `import X from '@pkg/…'` + `<X />`; content is external. (2) *self-contained* pages (`pages/plugins/*`, `learn/quick-start.mdx`, landing, `pages/ui/<name>.astro`) — prose written inline; the ui pages are `.astro` (`Demo` cards with `client:load` islands + the `@ui/concepts/<name>.mdx` import), not mdx. (3) *enumeration* pages (`learn/index.mdx`, `learn/patterns/index.mdx`, `reference/index.mdx`, `ui/index.mdx`) — hand-maintained link lists.
  - **Content aliases** — `@core` / `@css` / `@dom` / `@resource` / `@router` / `@store` → `../packages/<pkg>/docs/*`, plus `@registry/*` → `../packages/ui/dist/registry/*` (the ui demos' build-output alias; needs `bun bundle ui`). Defined in **two** places (`astro.config.mjs` `vite.resolve.alias` + `tsconfig.json` `compilerOptions.paths`); keep both in sync when adding a package or alias.
  - **Sidebar** — `nav.ts` is the single source of truth; `Sidebar.astro` `import.meta.glob`s every `pages/**/*.mdx` and match-merges frontmatter titles against nav entries at render time. Three top-level sections: `learn` (Quick-Start + Concepts/Patterns/Tutorials groups), `reference` (per-package), `plugins`.
  - **Search** — `astro-pagefind` indexes the built output (not source); rebuild (`astro build`) before verifying search results.

  ## Files

  | Path | Responsibility |
  |---|---|
  | `astro.config.mjs` | Integrations (`astro-icon`, `@astrojs/mdx`, `astro-pagefind`, `astro-plugin-hellajs`) + the seven `@<pkg>` Vite aliases + `@registry` + `@examples`. |
  | `tsconfig.json` | `astro/tsconfigs/strict` + `compilerOptions.paths` mirroring the Vite aliases. |
  | `package.json` | `predev`/`prebuild` (regenerate `src/generated/pagecss/` via `bun ../scripts/gen-demo-css.ts`) + `dev` / `build` / `preview` / `astro` scripts. |
  | `src/nav.ts` | Sidebar tree (the nav contract); entry forms below. |
  | `src/types/navigation.ts` | `NavNode` interface (`title`, `url?`, `children?`). |
  | `src/global.css` | Tailwind v4 (`@import "tailwindcss"`) + `@tailwindcss/typography` + `daisyUI` plugins; Mulish font; dark-theme color overrides (`:root` + `@theme`). |
  | `src/layouts/MainLayout.astro` | Docs layout: `Navbar` + `Sidebar` wrapper + mobile top-of-content "On this page" select-style dropdown (`#toc-mobile`) + inline client-side `<script>` that builds that dropdown and the desktop right-rail (`#toc-rail`) from `main h2, h3` at runtime. When the `demoCss` prop is present, inlines `LAYER_ORDER + demoCss` as `<style id="hella-css" is:inline>` — the id is what css-package hydration adopts, `LAYER_ORDER` (`src/utils/layer-order.ts`, TEMPORARY until the tailwind exit) first-declares every cascade layer with `hella` last so preflight cannot outrank demo rules. |
  | `src/layouts/LandingLayout.astro` | Landing-only layout (no sidebar/navbar); OG/Twitter meta. |
  | `src/components/Navbar.astro` | Top bar: logo, Learn/Reference/Plugins tabs, Pagefind `<Search>`, GitHub link, mobile hamburger. |
  | `src/components/Sidebar.astro` | Renders the current section's nav tree via `NavItem`; mobile drawer + persistent desktop. |
  | `src/components/NavItem.astro` | Recursive nav renderer (leaf vs. expandable `<details>`); active-link + active-parent detection. |
  | `src/components/Badge.astro` | npm version shield for a package (`package` prop). |
  | `src/components/CodeExample.mdx` | Static hero code block for the landing page. |
  | `src/components/RightSidebar.astro` | **Dead** — not imported anywhere. The live right-rail is the inline script in `MainLayout.astro`. Do not revive without wiring it in. |
  | `src/pages/index.astro` | Landing page (`LandingLayout`). |
  | `src/pages/learn/**` | `quick-start.mdx` + `concepts/` + `patterns/` + `tutorials/` — ALL are thin wrappers; content lives in `packages/*/docs/` (concepts/patterns) and `examples/{name}/tutorial.mdx` (tutorials). |
  | `src/pages/reference/{pkg}/**` | One wrapper page per exported symbol; imports `@<pkg>/api/<symbol>.mdx`. |
  | `src/pages/plugins/{babel,rollup,vite}.mdx` | Self-contained install/config guides (no package-doc import). |
  | `src/pages/ui/<name>.astro` | 59 self-contained component pages: a hero `Demo` card plus per-example `Demo` cards, each mounting an island from `src/demos/<name>-demo.tsx` via `client:load`, `InstallSection` for the four install sources, and the package-docs prose via `@ui/concepts/<name>.mdx`. Frontmatter reads its per-page css via a cwd-anchored `readFileSync("src/generated/pagecss/<name>.css")` (astro commands always run from `docs/`) and passes it to `MainLayout` as `demoCss`. |
| `src/demos/<name>-demo.tsx` | Island modules: import the component's built registry output (`@registry/<name>/css/<name>.js`) + `@registry/theme/tokens.dark.js` (site is dark-only), compose a demo with hellajs primitives, export named demo components. View Code renders this file's own source via `?raw`. Requires `bun bundle ui` first (`@registry` points into gitignored `dist/registry`). |
| `src/generated/install/<variant>/<name>.<ext>` | The four install-source variant dirs (`css-jsx/<name>.tsx`, `css-html/<name>.ts`, `tailwind-jsx/<name>.tsx`, `tailwind-html/<name>.ts`), generated byte-exact `add` output — regenerated by root `bun install-sources [entry ...]`, never hand-edited. |
| `src/generated/pagecss/<page>.css` | Per-page demo css, one file per ui page (gitignored) — generated by root `bun scripts/gen-demo-css.ts` (docs `predev`/`prebuild`; one fresh child process per page so module-level registrations re-run; requires `bun bundle ui` first), never hand-edited. |
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

  - **Right rail is runtime-scraped** — `MainLayout.astro`'s inline `<script>` reads `main h2, h3` after hydration to build "On this page" on both surfaces (desktop rail `#toc-rail`, mobile top-of-page select-style dropdown `#toc-mobile` — blur-closes on select and mirrors the chosen heading in its trigger label); headings rendered purely client-side won't appear. `RightSidebar.astro` is unused.
  - **Dark theme is hardcoded** — both layouts set `<html data-theme="dark">`; `global.css` overrides daisyUI `--color-base-*`. There is no theme toggle.
  - **SSR is unsupported** — packages are client-side; the site is a static `astro build`. `learn/index.mdx` carries an explicit "Server-side rendering is not currently supported" alert; do not silently remove it.
  - **`slug` vs `title`** — nav string entries map to URL slugs (lowercased), but the sidebar displays `frontmatter.title` when present. A page whose title casing differs from its slug still resolves correctly; only a missing/renamed *file* breaks the link.
  - **MDX is the default content format** — `Sidebar.astro` globs `**/*.mdx` for frontmatter titles; `.astro` pages are not glob-discoverable, so their sidebar titles resolve from the nav entry itself (dash→space fallback — the `ui/<name>.astro` pages rely on this; the landing `index.astro` is intentionally outside the nav).

  ## Drift surface (verify on every page add/remove/rename)

  The docs site has no test catching broken internal links, so each change must manually reconcile the full surface — this is the docs-site analogue of the root "full blast radius" rule:

  - **`nav.ts` ↔ `pages/**/*.{mdx,astro}`** — every entry must resolve to a file; every sidebar-visible page needs an entry. Stale entries render dead links or fall back to dash→space titles.
  - **Enumeration pages** — `learn/index.mdx`, `learn/patterns/index.mdx`, `reference/index.mdx`, `ui/index.mdx` are hand-maintained; known to drift. Re-walk these whenever a page is added, removed, or renamed.
  - **Prose cross-references** — before changing a behavior the docs describe, grep `src/pages/` for claims the change falsifies (e.g. an "X not supported" alert a new feature makes false).
  - **Aliases** — a new package needs its `@<pkg>` alias added to **both** `astro.config.mjs` and `tsconfig.json`.

  Follow `guides/docs.md` for all `.mdx`/prose authoring; it supersedes any style hint here.
</docs-site-instructions>
