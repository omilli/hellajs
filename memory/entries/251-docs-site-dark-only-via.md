---
type: decision
title: Docs site is dark-only via dist/registry — Component.astro scopes the default dark palette onto demo frames with tokens.js's .dark block; no docs-side tokens copy exists
description: The ui demos render the registry's default dark theme via @registry/theme/tokens.js's .dark class block on .demo-frame; no vendored tokens copy — a dark-value change lands with bun bundle ui alone.
tags: [ui, docs]
timestamp: 2026-10-05
last_confirmed: 2026-10-05
triggers: [tokens-js, dark-default-demos, registry-tokens, docs-demos, bundle-ui]
supersedes: 231
---
# Why

The docs demos run the registry's built output directly: each
`docs/src/demos/<name>-demo.tsx` island imports
`@registry/<name>/css/<name>.js` and mounts via `client:load` through the
`astro-plugin-hellajs` renderer; no island imports a theme module. The
single theme import lives in `docs/src/components/Component.astro`:
`@registry/theme/tokens.js` (not `tokens.dark.js`), whose `.dark` class
block declares the registry's default dark palette. `Component.astro` puts
the `dark` class on `.demo-frame`, so that direct class-scoped declaration
beats the site palette inherited from `html:root` (specificity mechanics
per entry 266) and the examples render exactly what a dark-default
registry install produces, while every surface outside demo frames keeps
the site palette. Portal-mounted demo surfaces (dialogs, dropdowns,
toasts) escape to `body` and fall back to the site palette — no
body-level `dark` class exists, because that would activate the
registry's `:is(.dark *)` style tweaks across the chrome. The docs-site
vendoring layer stays deleted — no `docs/src/components/ui/`, no
`docs/hella.ui.json` `themeMode` config, no
`packages/ui/tests/drift.test.ts` byte-matcher. Dark values change by
editing `packages/ui/registry/theme/` and running `bun bundle ui`:
nothing to re-vendor, nothing to re-byte-match.

# Evidence

2026-10-05, docs demo-theme scoping change: `Component.astro` imports
`@registry/theme/tokens.js` with the `dark` class on `.demo-frame`
(background `var(--background)`); `rg -l '@registry/theme' docs/src`
matches only `Component.astro` and `styles/tokens.ts`; `rg
'@registry/theme' docs/src/demos` matches nothing. `cd docs && bun run
build` exits 0; built `docs/dist/ui/button/index.html` carries
`class="demo-frame dark"` on every frame, exactly one `.dark {` default
palette block in the static head, the `html:root` site palette block
intact, and no `dark` class on `html`/`body`. Prior evidence (2026-10-02,
plans/docs/misc/demo-pipeline unit 05): vendoring deletion verified via
`fd . docs/src/components/ui` exit 1, `test ! -f docs/hella.ui.json`,
`bun coverage ui` exit 0.
