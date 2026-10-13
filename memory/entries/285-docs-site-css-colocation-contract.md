---
type: decision
title: Docs-site css colocation contract — component css in .astro frontmatter, shared sheets imported by the cssText-dancing layouts, never by components
description: "Component css lives in the markup-owning .astro frontmatter (plugin-extracted); css-bearing .ts sheets are layout-imported, never component-imported (extracted copies go unclaimed at hydration)."
tags: [arch, docs-site]
timestamp: 2026-10-13
last_confirmed: 2026-10-13
triggers: [docs-site-chrome-styles, astro-frontmatter-css-extraction, csstext-head-tag, island-splice-duplication, site-shared-css-sheet]
---
# Why
`plugins/astro/frontmatter.mjs` statically folds `css()`/`style()`/`keyframes()` out of every compiled `.astro` module's frontmatter (only modules that reference `cssText` keep runtime registration). That extraction IS the delivery path for markup-owning components — the CodeExample.astro pattern — landing as Astro-inlined styles per page (`build.inlineStylesheets: "always"` in docs/astro.config.mjs keeps pages request-free).

The landmine: the plugin also folds a module's import graph into `islandCss` and splices it into the module's template — but only when the quasi opens with `<head…>`/`<body…>`; anchorless modules merge `islandCss` into the virtual css import instead (`findIslandAnchor` → -1; pre-2026-10 it fell back to quasi start, emitting one duplicate `<style id="hella-css">` tag per component instance — Toc rendered twice). A css-bearing `.ts` sheet imported by a component therefore rides that page's virtual css (or the id'd tag on anchored pages) — delivered once per page either way, but unclaimable at hydration on anchorless pages, so layout-imported sheets remain the rule.

The contract (style-colocation restructure, 2026-09-17):
- Component css → frontmatter `css()` in the markup-owning `.astro` file (Navbar, DocsNav, Toc, Badge, index.astro, MainLayout's own site-main/nav-overlay — MainLayout is cssText-gated so its css stays runtime/head-delivered).
- Shared/global sheets → `docs/src/styles/*.ts` (tokens incl. layout-metric vars, preflight, fonts, global, prose, menu, plugin-cards), imported by the layouts (both, for head determinism — memory 258), never by extracted components. mdx pages may import styles sheets directly (mdx is not transformed).
- `.tsx` islands (SearchPalette) keep module-scope `css()` — only `.astro` frontmatter is extracted; module eval registers server-side into the head tag and hydration claims it.
- No const css values: layout metrics are `vars()` keys on tokens.ts (`navW`/`tocW`/`navbarH`); media preludes inline as literal `@media` keys.
- `@font-face` in `css()` works only via a JS asset import (`import woff2 from "@fontsource-variable/mulish/files/*.woff2"`) — Vite never rewrites `url()` inside `set:html` style tags.

# Evidence
- Failed state (chrome css in sibling `-css.ts`… earlier failed state: menu.ts imported by DocsNav/Toc): learn page carried 3 orphan 852-byte `<style id="hella-css">` tags (menu text, one per DocsNav/Toc render) and chrome only in a hashed `/_astro/*.css` chunk.
- Final state (css in frontmatter + menu layout-imported + inlineStylesheets always): every built page exactly one `hella-css` tag, menu text once, zero stylesheet links, all chrome selectors delivered in-head (`astro build`, 181 pages, dist inspection); font 200 via preview and dev.
