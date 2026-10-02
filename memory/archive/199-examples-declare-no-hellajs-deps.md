---
type: correction
title: examples/ declare no @hellajs/* deps (install lives in the tutorial); root walk-up covers ONLY root-declared workspaces — @hellajs/{ssr,store,ui} fail zero-install
description: examples/* declare no @hellajs/* deps; root walk-up resolves only the @hellajs workspaces root devDependencies declare — ssr/store/ui importers fail zero-install; verify by RUNNING, never bun add.
tags: [arch, examples, packaging, workspaces, config]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [examples-deps, example-runnability, add-example, example-package-json, standalone-example, examples-convention, bun-add-shadow, root-walkup]
supersedes: 026
---
# Why

Supersedes 026, whose central claim — "examples resolve @hellajs/* via root walk-up, so any example
runs with zero local install" — stopped holding on 2026-09-18. Commit 4366d850 declared exactly
`@hellajs/{core,css,dom,resource,router}` as root devDependencies, and bun's install (v1.3.3) links
only declared workspace packages into root node_modules. `@hellajs/{ssr,store,ui}` enter no
installable dependency graph anywhere — packages/ssr declares only peerDependencies, and
plugins/astro declares `@hellajs/ssr` only as a peerDependency — so their root symlinks vanished
and every example importing them fails zero-install. 026's own proof command was re-run and failed.
Three classes of future rework this governs:

1. **Wrong "broken" finding (valid, now scoped)** — an empty or absent `examples/<x>/node_modules`
   is normal; examples are apps/consumers whose install step lives in the tutorial (`bun add
   @hellajs/...`), never the committed package.json. But "resolves via root walk-up" is true ONLY
   for core/css/dom/resource/router — do not generalize to ssr/store/ui. (Memory 022's test-only
   cross-package dep remains a different shape; the 023 boundary is unchanged: packages/* are
   libraries with all-peerDeps, examples are apps that deliberately declare no runtime deps.)
2. **Wrong "fix" (valid, retained from 026)** — never `bun add` @hellajs/* into an example: it
   writes file:/version deps into package.json that survive node_modules/bun.lock deletion and
   shadows root symlinks with stale npm versions (026's original incident). Restoring zero-install
   runnability for ssr/store/ui importers is a repo-level decision (declare them at root, or bun's
   workspace linking changes) — not an example-level edit.
3. **Zero-install runnability is no longer a valid expectation for all examples** — treat a
   `Cannot find module '@hellajs/<pkg>'` from an example as the root-symlink gap it is, and check
   root devDependencies before diagnosing further.

# Evidence

- ALL 9 examples' package.json declare no @hellajs/* deps (read 2026-09-26): astro-islands (devDep
  astro ^7 only — absent from 026's enumeration), bench (`dependencies` holds only
  `@rollup/plugin-typescript` — the documented build-tooling exception), blog, counter, todo,
  theme-switcher (devDeps typescript/vite), ssr-islands (no deps, no devDeps — 026's "typescript
  only" has drifted), ssr-routing (typescript), ssr-streaming (typescript, vite,
  vite-plugin-hellajs — 026's "typescript/vite only" has drifted).
- Root `workspaces` = `["packages/*","plugins/*"]` — examples not a workspace (unchanged).
- `ls -la node_modules/@hellajs/` (2026-09-26): symlinks for exactly core, css, dom, resource,
  router → `../../packages/*`; NO ssr, store, ui. Matches root devDependencies' `workspace:*` set
  1:1. `git show 4366d850^:package.json`: root devDeps had zero @hellajs entries before 2026-09-18.
- Ran (2026-09-26, 026's own prescribed method): `cd examples/ssr-islands && bun src/server.js` →
  `error: Cannot find module '@hellajs/ssr'`; identical failure for `examples/ssr-routing`.
  `rg -n "@hellajs/(ssr|store|ui)" examples/*/src/` → ssr-islands/server.js,
  ssr-routing/server.js, ssr-streaming/server.tsx (ssr); blog/src/state.ts (store).

Re-verify before trusting if root devDependencies' `@hellajs/*` `workspace:*` set changes, a bun
upgrade changes workspace linking, or an example's package.json gains dependencies.
