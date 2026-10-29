---
title: Alias JSX-bearing @hellajs packages to lib source on server-consuming sites, with an absolute path
description: A site whose server arm imports a JSX-bearing @hellajs package bare gets the dom-target dist and throws "document is not defined" at SSR; alias the specifier to lib/index.ts via fileURLToPath — relative ../ alias values apply in build but silently fall back to the dist in dev.
tags: [ssr, astro, docs-site, vite, alias, headless, dist, template, dev-server]
confirmed: 2026-10-29
---

# Why

`@hellajs/headless`'s parts tier is JSX-bearing: its dist compiles at the babel plugin's dom
target, producing module-scope `template()` builders (`packages/headless/dist/popover.js` holds
`_hellaTemplate('<button …')` calls at top level, importing `template` from
`@hellajs/dom/runtime`). Any bare `@hellajs/headless` import on a server arm executes those at
module-evaluation time and dies: `document is not defined` with the stack
`parseWithContext ← template ← ModuleJob.run`. Headless was safe to consume from dist while
JSX-free (its foundations are inert on a server); the popover family made it the first
JSX-bearing runtime package a server arm imports. Until a package ships an `ssr` export
condition (an ast-compiled dist variant), every server-consuming surface must alias the bare
specifier to `lib/index.ts` so the vite plugin compiles the source per environment (ast on the
server — `@hellajs/ssr`'s currency; dom on the client). The alias value must be ABSOLUTE
(`fileURLToPath(new URL('../packages/<pkg>/lib/index.ts', import.meta.url))`): a relative `../`
value escapes the vite project root, and rolldown-vite 8 resolves it in `astro build` (green,
parts SSR'd) but NOT in `astro dev` — dev silently falls back to the node_modules dist and the
failure resurfaces as the same cryptic `document is not defined`.

# Evidence

Probe chain 2026-10-29 (astro 7.2.0, docs site): with the relative alias
`'@hellajs/headless': '../packages/headless/lib/index.ts'` in `docs/astro.config.mjs`
`vite.resolve.alias`, `npm run build` exited 0 with all six popover-family pages carrying
part markup, while `npm run dev` served every `/ui/*` page HTTP 500 with
`document is not defined` at `parseWithContext ← template ← ModuleJob.run` (the stack's
`ModuleJob.run` frame marks Node loading the externalized dist — the alias never applied).
Switching only the alias value to `fileURLToPath(new URL('../packages/headless/lib/index.ts',
import.meta.url))` gave dev HTTP 200 on popover, tooltip, dropdown-menu, context-menu,
menubar, hover-card with zero dev-log errors. Per-environment targeting lives in
`plugins/vite/index.mjs` (server consumer → `target: "ast"`). A second, independent fix in the
same chain: `scripts/bundle/esbuild-build.ts` / `scripts/bundle/optimize.ts` import-fixup
regexes previously matched only `from "x"` clauses, emitting extensionless side-effect imports
(`import "./features/namespaces"`) in `packages/dom/dist/hydrate.js` +
`dist/internal/reactive.js` — invalid for Node ESM; the regexes now cover the bare
`import "x"` form and the dist emits `.js`/`.min.js` specifiers.
