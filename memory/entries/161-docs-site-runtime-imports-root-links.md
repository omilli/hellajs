---
type: decision
title: "Docs-site @hellajs/* runtime imports resolve via root workspace links (user decision) — workspace:* AND link: both fail in docs/ because it is not a root-workspace member"
description: "docs/ is not a root-workspace member, so workspace:* and link: deps both fail there; bare @hellajs/* imports resolve via root node_modules symlinks. Declare nothing in docs/package.json."
tags: [toolchain, docs-site, bun-workspace, install-topology, ui-demos]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [docs-site-dependency, workspace-protocol, site-imports-hellajs, bun-link-protocol, add-site-runtime-dep]
---
# Why

Unit 12 (in-page demos) made the docs site import `@hellajs/{core,dom,css,ssr}` for the first time. The plan premised `"workspace:*"` deps in `docs/package.json`, but `docs/` is not matched by the root workspaces globs (`packages/*`, `plugins/*`) and carries its own `bun.lock`, so `bun install` in docs/ treats it as a standalone root: `workspace:*` fails with "failed to resolve", and bun's `link:` protocol — workspace-scoped like pnpm's — fails with `FileNotFound: failed linking dependency/workspace to node_modules`. Alternatives weighed: full workspace membership would restructure lockfiles (docs/bun.lock dies, root bun.lock grows the astro/tailwind tree) and put a new package in the changesets enumeration; `file:` copies dist at install time (stale-prone). Resolution needs nothing: bare imports from docs/ walk up to `<root>/node_modules/@hellajs/*` symlinks (bun -e probe: ssr/dom/css all resolve). User picked implicit root links over membership (asked 2026-09-17).

# Evidence

- `bun install` in docs/ with `workspace:*` deps: "error: @hellajs/core@workspace:* failed to resolve" (×4) — 2026-09-17.
- Retry with `link:../packages/<pkg>`: "FileNotFound: failed linking dependency/workspace to node_modules for package @hellajs/dom" (×4) — same session.
- `cd docs && bun -e "import('@hellajs/ssr')…"`: ssr/dom/css all resolve via root symlinks (`node_modules/@hellajs/ssr -> ../../packages/ssr`), 2026-09-17; `astro build` green post-change with zero docs/package.json dep entries (115 pages).
- Root AGENTS.md `docs/` folder row now carries the mechanism one-liner (root workspace links, no docs-local deps).
