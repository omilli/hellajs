---
type: fact
title: "Docs-site package aliases resolve via docs/tsconfig.json paths, not astro.config aliases; under Astro 7/rolldown an alias present only in astro.config fails with 'Rolldown failed to resolve'"
description: "Site import aliases (e.g. @ui/*) need entries in BOTH docs/astro.config.mjs resolve.alias and docs/tsconfig.json paths; astro.config alone fails the build with a Rolldown resolve error."
tags: [toolchain, docs-site, astro, vite-alias, tsconfig-paths]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [astro-alias, site-alias, rolldown-resolve, tsconfig-paths, new-package-docs-wrapper, add-site-alias]
---
# Why

The docs site's `@core/*`...`@examples/*` imports resolve through Astro's TypeScript `paths` support, which feeds Vite's alias map. `docs/astro.config.mjs` also carries an `resolve.alias` object, so it looks authoritative, but a package whose alias exists ONLY there fails the build: `Rolldown failed to resolve import "@primitives/api/onoutside.mdx"` (the primitives unit added the astro.config alias but not the tsconfig path; the site build had not been run since). Empirically: with `@primitives/*` absent from `docs/tsconfig.json` paths, every wrapper importing it fails while all seven tsconfig-mapped aliases build; adding the path alone fixes it. Conversely, relative imports like `../../../../packages/x/docs/index.mdx` ALSO fail with `[UNRESOLVED_IMPORT] Module not found` even when the file exists, so aliases are the only working mechanism.

# Evidence

2026-09-17, Unit 10 of plans/ui/code/hellajs-ui (docs-site section): baseline `astro build` failed at the first `@primitives/*` import; moving the page aside moved the failure to the next `@primitives/*` import while all `@css/*`/`@ssr/*` pages built; `docs/tsconfig.json` paths lacked `@primitives/*`; adding it (plus `@ui/*` for the new components section) made `astro build` complete (109+ pages). Relative-import probes failed with the file clearly present on disk. Rule: a new package docs wrapper alias goes into BOTH config files, and the docs build belongs in the verification gate of any unit that touches site aliases.
