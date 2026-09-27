---
type: correction
title: Adding a new packages/* workspace requires nine registrations beyond the folder itself — bun install, tsconfig paths, doc-snippets PACKAGES, astro alias, nav.ts, three index pages, README row (browser-reactive scope only)
description: "A new packages/* workspace needs nine registrations or stays invisible: bun install, tsconfig paths, doc-snippets PACKAGES, astro alias, nav.ts, three index pages, README row if browser-reactive."
tags: [packaging, workspaces, docs, toolchain, onboarding]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [new-package-scaffold, add-workspace, package-registration, doc-snippets-packages-list, new-package-docs, readme-packages-table]
supersedes: 147
---
# Why

AGENTS.md §docs names the site-surface half (nav.ts + enumeration indexes) for Docs tasks; the workspace/toolchain half is nowhere consolidated. Missing pieces fail at different gates at different times, not all at once — empirically during `@hellajs/primitives` (2026-09-11, since dissolved into `@hellajs/dom` in fb093851): tests could not resolve the bare specifier until `bun install` linked the workspace; guards flagged missing enumerations only AFTER docs existed (`lint:structure` → learn/index.mdx, then `doc-links` → /reference/primitives needing its own index page); the doc-snippets PACKAGES const fails nothing — it silently skips typechecking the new package's docs (`ui` ships `packages/ui/docs/` with ts/tsx fences and is absent from PACKAGES today: never typechecked, no error).

Checklist (beyond `packages/{pkg}/` itself: lib, tests, docs, package.json, tsconfig, README, AGENTS.md, LICENSE per root AGENTS.md §Package layout):
1. `bun install` — links `node_modules/@hellajs/{pkg}` (root workspaces glob `packages/*` needs no edit).
2. `tsconfig.lint.json` paths — `{pkg}`, `{pkg}/bundle`, `{pkg}/*` entries (tsc gate).
3. `scripts/doc-snippets.ts` `PACKAGES` const — append or the package's docs are never snippet-typechecked (silent skip, no error). Known exception: `ui` (excluded by choice).
4. `docs/astro.config.mjs` alias — `'@{pkg}/*': '../packages/{pkg}/docs/*'` (wrapper imports fail without it).
5. `docs/src/nav.ts` — reference object `{ {pkg}: [...] }` + Concepts entry when a concept doc exists.
6. `docs/src/pages/learn/index.mdx` — Package Overview bullet + Concepts bullet (`lint:structure` enumeration check).
7. `docs/src/pages/reference/index.mdx` — import + section; plus `docs/src/pages/reference/{pkg}/index.mdx` wrapper for `/reference/{pkg}` links (`doc-links`). (`ui` has no reference wrapper — its docs live under `docs/src/pages/ui/`.)
8. Root `README.md` "Reactive Packages" table row (alphabetical) — **only for browser-reactive packages in that table's scope** ("a modular collection of reactive packages, with @hellajs/core as a peer dependency"): `ssr` (zero runtime imports) and `ui` (no importable component surface) have never had rows. Not a universal step — 147's unconditional phrasing was the correction's trigger.

# Evidence

Re-verified 2026-09-26 against the eight current packages (store as probe):
- `package.json:6-9` workspaces `["packages/*", "plugins/*"]`; `tsconfig.lint.json:56-80` carries the `{pkg}`/`{pkg}/bundle`/`{pkg}/*` triple for store, ssr, ui.
- `scripts/doc-snippets.ts:79` `PACKAGES = ["core","dom","css","resource","router","store","ssr"]`, consumed by the typecheck loop at :360; `packages/ui/docs/concepts/*.mdx` contain ts fences yet ui is unlisted.
- `docs/astro.config.mjs:14-24` aliases incl. `'@ui/*'`; `docs/src/nav.ts:75` `{ store: [...] }`, `:81` ui entry.
- `learn/index.mdx:18` (Package Overview) + `:32` (Concepts) list store; `scripts/doc-structure.ts:522` emits `page not listed in its enumeration page (learn/index.mdx)`.
- `reference/index.mdx:13` imports `@store/index.mdx`, `:38` store section; `docs/src/pages/reference/store/` wrapper exists.
- `README.md:34-43` table lists core, css, dom, resource, router, store only; `git log -S '@hellajs/ssr'` and `-S '@hellajs/ui'` on README.md return zero commits — never present, so the scope is deliberate, not drift.
