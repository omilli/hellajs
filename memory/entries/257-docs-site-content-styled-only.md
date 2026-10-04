---
type: decision
title: Docs-site content is styled only by site-owned CSS modules — no tailwind scanning exists; content classes do nothing unless a site module defines them
description: Docs content styling comes only from site-owned css()/style() modules and the Callout component; never re-add @source lines or utility classes to package docs or tutorials.
tags: [docs, build, css]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [docs-content-styling, callout-component, docs-css-missing, tailwind-exit]
supersedes: 055
---
# Why

The docs site carries zero tailwind/daisyUI. Package docs and tutorials are
styled exclusively by site-owned modules collected into the layout head via
`cssText()` (prose typography under `main`, callout styles, chrome); semantic
callouts are `<Callout variant="info|warning|error">` imported from
`@components/Callout.astro` (alias declared in `docs/astro.config.mjs` +
`docs/tsconfig.json`). A raw daisy/tailwind class attribute in content mdx
now renders as dead markup: nothing scans content for classes, so nothing
compiles CSS for it. Re-adding `@source` lines or utility classes to fix
"missing styles" cannot work — the fix is always a site-owned module or the
Callout component.

# Evidence

`rg -c "tailwind|daisyui|@apply" docs/src/global.css docs/astro.config.mjs
docs/package.json` → 0 matches after unit 11 (site-foundation set); the
fence-stripped probe over `packages/*/docs examples/*/tutorial.mdx` finds
zero `class="alert` attributes; `cd docs && bun run build` exits 0 with the
four packages (`tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/typography`,
`daisyui`) removed from `docs/package.json`.
