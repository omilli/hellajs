---
type: correction
title: Docs declares zero @hellajs/* deps — runtime imports resolve via root walk-up and the checkPeers warning on every add sync is expected, never fix it by declaring peers
description: "docs/package.json holds no @hellajs/*: bare imports resolve via root walk-up, docs/bun.lock stays @hellajs-free, checkPeers warning is warn-only and deliberate; never bun add @hellajs/* into docs/."
tags: [arch, docs, packaging, workspaces, config]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [docs-package-json, checkpeers-warning, docs-install, docs-resolution, file-dep-shadow, docs-bun-lock]
supersedes: 212
---
# Why

Supersedes 212 ("docs/package.json `file:` deps exist to satisfy ui checkPeers"), reversed by the
standalone-install rework (v2 working tree, 2026-10-07): the `file:` deps and the `overrides`
block are gone, and the empty manifest is now the invariant. What makes it work: root
devDependencies declare every `@hellajs/*` as `workspace:*` (memory 240's mechanism), so the bare
`@hellajs/*` imports in vendored `src/components/ui/` files and astro inline `<script>`s resolve
via root `node_modules` walk-up — `docs/node_modules` holds no `@hellajs` and `docs/bun.lock` has
zero `@hellajs` entries. Consequence: ui `checkPeers` (packages/ui/lib/internal/peers.ts) reads
the target manifest and warns when copied source imports packages it does not declare, so every
docs `add` sync prints a warning naming `@hellajs/{core,css,dom}` (plus clsx/tailwind-merge/
tw-animate-css) — warn-only, exit 0, build unaffected. Do not "fix" it by declaring peers,
restoring `file:` deps, or adding overrides; and never `bun add @hellajs/<pkg>` into docs/ (the
212/195 shadow hazard: a docs-local copy shadows the root link with a stale, possibly dist-less
copy).

# Evidence

- `docs/package.json`: no `@hellajs` key anywhere, no `overrides` (read 2026-10-07); the diff
  against HEAD removes exactly the four `file:` deps + the overrides block.
- `docs && bun install` → "Checked 359 installs across 476 packages (no changes)";
  `docs && bun run build` → exit 0, 181 pages, no checkPeers noise in the build log (2026-10-07).
- `packages/ui/lib/internal/peers.ts` `checkPeers`: console.warn over
  dependencies/devDependencies/peerDependencies, never throws on missing deps; registry deps union
  = `@hellajs/css`, `clsx`, `tailwind-merge`, `tw-animate-css` (registry.json), all absent from
  the docs manifest — so the warning fires on add while the build stays green.
- `ls docs/node_modules/@hellajs` → absent; `rg '@hellajs' docs/bun.lock` → zero hits.
