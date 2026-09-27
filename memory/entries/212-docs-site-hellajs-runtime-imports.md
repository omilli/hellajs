---
type: correction
title: "Docs-site @hellajs/* runtime imports resolve via root workspace links; docs/package.json file: deps exist to satisfy ui checkPeers, not installation"
description: "Bare @hellajs/* imports in docs/ resolve via root node_modules symlinks; the file: deps in docs/package.json only satisfy the ui add CLI's checkPeers gate — they are not installed."
tags: [toolchain, docs-site, bun-workspace, install-topology, ui-demos]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [docs-site-dependency, workspace-protocol, site-imports-hellajs, check-peers-gate, add-site-runtime-dep]
supersedes: 161
---
# Why

Supersedes 161: its resolution ("declare nothing in docs/package.json") was reversed by the ui registry work (commit d48d29b6), which added `@hellajs/{core,css,dom}` as `file:../packages/<pkg>` deps in docs/package.json. The earlier findings still hold — docs/ is not matched by root workspaces globs (`packages/*`, `plugins/*`), carries its own bun.lock, and `workspace:*`/`link:` fail there — but the file: deps are a declaration-only measure: they satisfy `checkPeers` (packages/ui/lib/internal/peers.ts), which reads the target package.json and warns when copied component source imports @hellajs packages the manifest does not declare. Runtime resolution is unchanged: docs/node_modules holds no @hellajs and docs/bun.lock has zero @hellajs entries, so imports walk up to `<root>/node_modules/@hellajs/*` symlinks. Do not "fix" the file: deps to workspace:* or link: — both fail in docs/; and never add real install wiring without revisiting lockfile topology.

# Evidence

- `jq '.workspaces' package.json` → `["packages/*", "plugins/*"]`; `docs/bun.lock` exists — 2026-09-27.
- `docs/package.json` dependencies: `@hellajs/{core,css,dom}: "file:../packages/<pkg>"`; added in d48d29b6 (`-S 'file:../packages/core'`), which postdates the last docs/bun.lock touch (55a0acc8) — lock and docs/node_modules have no @hellajs.
- `cd docs && bun -e "import('@hellajs/dom')…"` → resolves, 32 exports, via root symlink `node_modules/@hellajs/dom -> ../../packages/dom` — 2026-09-27.
- `packages/ui/lib/internal/peers.ts` checkPeers: warn-only manifest scan over dependencies/devDependencies/peerDependencies.
- Root AGENTS.md `docs/` row: "docs/package.json declares the `@hellajs/*` peers, satisfying `checkPeers`" — the 161-era "root workspace links" one-liner is gone.
