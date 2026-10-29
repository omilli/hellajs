---
title: Ship JSX-bearing @hellajs packages an ssr export condition; astro consumers resolve it through a configEnvironment hook
description: An ast-compiled dist/ssr variant behind a bundler-only "ssr" condition makes JSX-bearing packages server-safe; vite ignores the condition unless a plugin configEnvironment hook adds it to the ssr+prerender environments — astro 7.2 replaces user environments.prerender config wholesale, and ssr.noExternal alone is a no-op.
tags: [ssr, astro, vite, export-conditions, headless, dist, configenvironment, prerender]
confirmed: 2026-10-29
---

# Why

A JSX-bearing `@hellajs/*` package ships two dist arms: the regular `import` arm (dom-target,
`template()` builders at module scope, client-only) and an `ssr` arm (`dist/ssr/*.js`,
ast-compiled HellaNode literals, zero dom-runtime builders — safe to import in bare Node). The
`ssr` condition is bundler-only: Node ignores it unless `--conditions ssr` is passed, so any
tool resolution path that falls through to Node picks the dom arm and dies at module evaluation
with `document is not defined`. Vite does not fix this by itself: it internalizes symlinked
workspace packages into the server bundle (so `ssr.noExternal` changes nothing about which arm
resolves) but resolves them with its server condition set, which does NOT include `ssr` — the
import arm wins and the module-scope `template()` call throws. Setting the condition from user
config does not reach astro's prerender build either: astro 7.2 composes the base vite config by
spreading user `environments` and then REPLACING the `prerender` (and `client`) environment keys
wholesale, so `environments.prerender.resolve.conditions` is silently dropped; the legacy
`ssr.resolve.conditions` key has no effect on rolldown-vite 8. The only surface that reaches
both server environments is a vite plugin `configEnvironment(name, config)` hook, which the
astro integration (`plugins/astro/index.mjs`) ships zero-config: it appends `"ssr"` to
`config.resolve.conditions` when the environment name is `ssr` or `prerender`. Client
environments keep the default condition set, so they resolve the dom arm and hydrate the server
markup.

# Evidence

Probe chain 2026-10-29 (astro 7.2.0, rolldown-vite 8.3.4, `@hellajs/headless` first
JSX-bearing package):

- Bare Node `import("@hellajs/headless")` throws `document is not defined` at
  `template ← dist/popover.js:1` (dom arm via the `import` condition); `node --conditions ssr`
  imports `dist/ssr/index.js` clean and `popover` is a function — the condition wiring is the
  whole fix at the Node level.
- `astro build` with the alias removed and NO condition fix: exit 1 at `/ui/breadcrumb`, stack
  `parseWithContext ← template ← chunks/menu_*.mjs:7` — the headless dom dist was INLINED into
  the prerender chunks (bundled, not externalized), proving externalization is not the missing
  piece; the resolve condition is.
- `vite: { ssr: { resolve: { conditions: ["ssr"] } } }` and
  `vite: { environments: { ssr: { resolve: { conditions: ["ssr"] } } } }`: both builds fail with
  a byte-identical chunk hash — zero effect (legacy key dead in vite 8; env-API key dropped by
  astro's prerender replacement).
- A `configEnvironment` probe plugin adding `"ssr"` to the `ssr` + `prerender` environments:
  `astro build` exits 0 (186 pages, popover part markup in the output HTML) and `astro dev`
  serves all six popover-family pages HTTP 200 with zero `document is not defined` in the dev
  log — with the source alias removed and no other site config.
- `packages/headless` is the only workspace with `.tsx` lib sources, so the `dist/ssr` emission
  (bundle pipeline `buildSsrModules`) scopes to it; the ast arm's only extra imports are
  `@hellajs/dom` (barrel + `features/hooks`) and `@hellajs/core`, all server-safe at module
  scope (verified by bare-Node import).
