---
type: correction
title: examples/ are root-workspace members declaring their true deps — @hellajs/* as workspace:*, one root install links everything
description: examples/* declare their true deps (@hellajs/* as workspace:*); one root install links them all, ssr/store/ui included — never bun add @hellajs/* into an example (version deps shadow the link).
tags: [arch, examples, packaging, workspaces, config]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [examples-deps, example-runnability, example-package-json, workspace-links, bun-add-shadow, root-install, add-example]
supersedes: 199
---
# Why

Supersedes 199, whose central claim — "examples declare no `@hellajs/*` deps; the tutorial owns
the install" — was reversed on 2026-10-02 by 91dfcc34 ("chore: unify workspace deps"): examples
became root-workspace members (root `workspaces` includes `examples/*`) declaring their true
dependencies — `@hellajs/*` as `workspace:*` plus registry build tooling — and one root
`bun install` links every declared package into the example's own `node_modules`, including
`@hellajs/{ssr,store,ui}` when declared (no root link and no manual symlink needed). Root
AGENTS.md §Folder structure codifies the convention. Retained from 199: never
`bun add @hellajs/<pkg>` inside an example — it writes a registry/file version into
package.json that shadows the `workspace:*` link with a stale installed copy; edit the
`workspace:*` entry instead (or rely on the committed declaration).

# Evidence

- Root `package.json` `workspaces` = `["packages/*", "plugins/*", "examples/*"]` (read
  2026-10-02, main tree).
- `examples/ssr-islands/package.json` declares `@hellajs/{core,css,dom,ssr}` as `workspace:*`;
  `examples/ssr-routing/package.json` adds `@hellajs/router` (read 2026-10-02 in worktree
  wt/plans-ssr-docs-hono-node-servers, cut from v2 @ 818fab8c).
- `ls examples/ssr-islands/node_modules/@hellajs/` after a plain root install: symlinks core,
  css, dom, ssr → `../../../../packages/*` — ssr included, zero manual steps; the same tree then
  served the example's Hono server via `node src/server.js` with the smoke test green
  (verified 2026-10-02).
- `git log -- examples/ssr-islands/package.json`: 91dfcc34 (2026-10-02) introduced the
  dependency block ("chore: unify workspace deps").
- Tutorials keep npm-shaped install recipes (`npm install @hellajs/...`) for out-of-repo
  readers — `examples/ssr-streaming/tutorial.mdx` and the rewritten ssr-islands tutorial both
  do; the committed `workspace:*` manifest is the in-repo twin of that recipe.
