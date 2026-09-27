---
type: decision
title: Adding a new packages/* workspace requires nine registrations beyond the folder itself — doc-snippets PACKAGES, astro alias, nav.ts, three index pages, README table, tsconfig paths, workspace install
description: A new packages/* workspace needs nine registrations or stays silently invisible: doc-snippets PACKAGES, astro alias, nav.ts, three index pages, README table, tsconfig paths, bun install.
tags: [packaging, workspaces, docs, toolchain, onboarding]
timestamp: 2026-09-11
last_confirmed: 2026-09-11
triggers: [new-package-scaffold, add-workspace, package-registration, doc-snippets-packages-list, new-package-docs, primitives-ui-scaffold]
---

# Why

AGENTS.md §docs names the site-surface half (nav.ts + enumeration indexes) for Docs tasks; the workspace/toolchain half is nowhere consolidated, and `@hellajs/ui` (plan set `plans/ui/code/hellajs-ui/` unit 02) repeats this immediately. Missing pieces fail at different gates at different times, not all at once — the empirical order during `@hellajs/primitives` (2026-09-11): tests cannot resolve the bare specifier until `bun install` links the workspace; guards only flagged the missing enumerations AFTER the docs existed (`lint:structure` → learn/index.mdx, then `doc-links` → /reference/primitives needing its own index page); the doc-snippets PACKAGES const fails nothing — it silently skips typechecking the new package's docs.

Checklist (beyond `packages/{pkg}/` itself: lib, tests, docs, package.json, tsconfig, README, AGENTS.md, LICENSE):
1. `bun install` — links `node_modules/@hellajs/{pkg}` (root workspaces glob needs no edit).
2. `tsconfig.lint.json` paths — `{pkg}`, `{pkg}/bundle`, `{pkg}/*` entries (tsc gate).
3. `scripts/doc-snippets.ts` `PACKAGES` const — append or the package's docs are never snippet-typechecked (silent skip, no error).
4. `docs/astro.config.mjs` alias — `'@{pkg}/*': '../packages/{pkg}/docs/*'` (wrapper imports fail without it).
5. `docs/src/nav.ts` — reference object `{ {pkg}: [...] }` + Concepts entry when a concept doc exists.
6. `docs/src/pages/learn/index.mdx` — Package Overview bullet + Concepts bullet (`lint:structure` check 6).
7. `docs/src/pages/reference/index.mdx` — import + section; plus `docs/src/pages/reference/{pkg}/index.mdx` wrapper for `/reference/{pkg}` links (`doc-links`).
8. Root `README.md` packages table row (alphabetical).

# Evidence

- `bun install` post-scaffold: `ls node_modules/@hellajs/` gained `primitives`; `bun bundle primitives` then built (2.4KB).
- `bun lint:guards` first run: `docs/src/pages/learn/concepts/headless-behaviors.mdx — page not listed in its enumeration page (learn/index.mdx)`; after that fix: `doc-links: /reference/primitives matches no page` until `reference/primitives/index.mdx` wrapper existed. All green after the full checklist: guards exit 0, doc-snippets strict clean (102 docs).
- `scripts/doc-snippets.ts` line ~56: `const PACKAGES = [..., "ssr", "primitives"] as const` — the edit that turned the silent skip into coverage (strict findings in primitives docs surfaced immediately: 3 undeclared names, fixed).
