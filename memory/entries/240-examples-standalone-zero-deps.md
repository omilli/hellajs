---
type: correction
title: Examples install standalone with zero @hellajs/* deps — root devDependencies declare every @hellajs/* + plugin, so bare imports resolve via root walk-up
description: "Examples are NOT root workspaces: each installs standalone (own committed bun.lock), declares no @hellajs/* deps, resolves bare imports via root walk-up; never bun add @hellajs/* into an example."
tags: [arch, examples, packaging, workspaces, config]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [examples-deps, example-runnability, example-package-json, workspace-links, bun-add-shadow, root-install, add-example, per-example-lock, example-bun-lock]
supersedes: 238
---
# Why

Supersedes 238 ("examples are root-workspace members declaring `workspace:*` deps"), reversed by the
standalone-install rework (v2 working tree, 2026-10-07). Root `workspaces` are back to
`packages/*, plugins/*` — examples are NOT workspace members. Instead the root devDependencies
declare every `@hellajs/*` package (core, css, dom, resource, router, store, ssr) plus all four
hellajs plugins (babel, vite, rollup, astro) as `workspace:*`, and that single root declaration is
what makes bare `@hellajs/*` and plugin imports resolvable from inside any example: resolution
walks up to the root `node_modules` symlinks, so no example manifest needs to declare them. Keeping
`@hellajs/*` out of example manifests is the invariant — it is what stops registry/file version
pins from ever shadowing the live workspace link (the shadow hazard 199/026 first surfaced, still
true).

Per-example install: each example runs `bun install` inside its own folder (own `node_modules` +
COMMITTED `bun.lock` pinning its framework tooling — vite/astro/hono/rollup; user decision
2026-10-07) and declares only that tooling. Tooling versions are therefore per-example, not
root-uniform (examples pin vite 7.x; docs' astro 7.3.5 pulls vite 8.x). Configs import plugins as
bare specifiers (`vite-plugin-hellajs`, `rollup-plugin-hellajs`, `astro-plugin-hellajs`), never
relative `../../plugins/...` paths.

Retained from 238/199: never `bun add @hellajs/<pkg>` inside an example — it writes a registry
version into the manifest that shadows the root-walk-up link with a stale installed copy; edit the
root declaration instead (or rely on it being already complete).

# Evidence

- Root `package.json`: `workspaces = ["packages/*", "plugins/*"]`; devDependencies declare
  `@hellajs/{core,css,dom,resource,router,store,ssr}` + `babel-plugin-hellajs`,
  `vite-plugin-hellajs`, `rollup-plugin-hellajs`, `astro-plugin-hellajs`, all `workspace:*`
  (read 2026-10-07, working tree); root `bun install` → "no changes".
- All 9 examples' `package.json` hold zero `@hellajs/*`/plugin deps (only vite/astro/hono/rollup/
  typescript tooling) and each carries a committed `bun.lock`; `bun install` in every example →
  "no changes" (2026-10-07).
- `examples/blog && bun run build` → vite 7.3.6 build exit 0 (140 modules, `vite-plugin-hellajs`
  bare import resolved); `examples/astro-islands && bun run build` → exit 0
  (astro-plugin-hellajs bare import); `examples/ssr-islands && bun run start` + curl → rendered
  HTML from `@hellajs/ssr` via walk-up (all 2026-10-07).
