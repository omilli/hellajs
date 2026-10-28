---
title: "Add docs-site package aliases to three surfaces: tsconfig paths, astro.config, doc-structure ALIAS_DIRS"
description: "A new package's docs-site wrapper alias (@pkg/*) resolves via docs/tsconfig.json paths first — updating only astro.config.mjs and nav.ts leaves every wrapper page 500."
tags: [docs-site, alias, tsconfig-paths, rolldown-vite, astro, doc-structure]
confirmed: 2026-10-28
---
# Why

`@pkg/*` wrapper imports on the docs site resolve through THREE parallel surfaces, and the load-bearing one is the least obvious: `docs/tsconfig.json` `compilerOptions.paths`. Vite 8 (rolldown-vite) reads tsconfig paths natively, so `astro.config.mjs` `vite.resolve.alias` alone does nothing for a new scope — an isolated probe resolved `@core/probe.ts` with the vite alias map stripped entirely, while `@headless/probe.ts` failed with the alias present. Missing the tsconfig entry yields the user-facing "Cannot find module '@pkg/...' imported from 'docs/src/pages/...'" (dev server 500) and "Rolldown failed to resolve import" (astro build exit 1). The third surface, `ALIAS_DIRS` in `scripts/doc-structure.ts`, mirrors the map for the anchor-resolution check — an unknown scope dereferences `ALIAS_DIRS[imp[1]!]!` on `undefined` and crashes `vp run lint:structure`. Adding a package's docs to the site therefore means touching all three: `docs/tsconfig.json` paths, `astro.config.mjs` alias, `ALIAS_DIRS` (plus nav.ts registration, which is the documented step). Separately: unquoted `: ` inside a wrapper `description:` frontmatter value breaks js-yaml parsing (reported as "bad indentation of a mapping entry") — quote values containing a colon-space, as sibling wrappers do.

# Evidence

Repro chain (2026-10-28, docs-site build): with `@headless/*` only in astro.config.mjs, `astro build` failed "Rolldown failed to resolve import \"@headless/api/trapfocus.mdx\""; adding `"@headless/*": ["../packages/headless/docs/*"]` to docs/tsconfig.json paths (no other change) made `npm run build` exit 0 with 181 pages and turned the dev server's three 500 pages into 200s. Alias-surface proof: vite 8.3.4 probe build with ONLY `@headless/*` in `resolve.alias` still failed `@headless/probe.ts` while `@core/probe.ts` built with no `@core` alias configured at all (tsconfig paths present). `vp run lint:structure` clean (294 mdx, 7 checks) after adding `headless: "packages/headless/docs"` to ALIAS_DIRS.
