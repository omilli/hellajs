---
type: decision
title: Astro delivers virtual-module CSS imports injected into compiled .astro modules — an enforce-post vite transform is the extraction seam for frontmatter styles
description: An enforce-post vite transform receives compiled .astro modules (frontmatter inside the $$createComponent arrow); an injected virtual .css import lands page-scoped and inlined via Astro's pipeline.
tags: [astro, css, build]
timestamp: 2026-05-05
last_confirmed: 2026-05-05
triggers: [astro-frontmatter-css, virtual-css-module, astro-css-pipeline, compiled-astro-transform]
---
# Why

Compile-time CSS extraction in `astro-plugin-hellajs` (plans/astro/code/frontmatter-css-extraction/)
rests on two mechanics a scratch probe verified empirically on Astro 7.2 static builds in
`examples/astro-islands`: (1) a vite plugin with `enforce: "post"` receives the COMPILED
`.astro` module in `transform` — the `@astrojs/compiler` output keeps the id ending
`.astro`, hoists frontmatter imports to module top, and wraps frontmatter statements inside
the `$$createComponent(($$result, $$props, $$slots) => { … })` arrow body, so a full AST
walk over the compiled module reaches every creator call; (2) prepending
`import "virtual:….css"` (resolveId → `\0`-prefixed id, load → rule text) to that module
makes Astro collect the CSS through its own pipeline — page-scoped, deduped, emitted as an
inlined `<style>` appended near `</head>` (after author-placed inline styles, so extracted
rules win equal-specificity ties; islands re-register into their own runtime `#hella-css`
element which never drains Astro-emitted tags).

What breaks if ignored: re-deriving the seam risks ordering assumptions (enforce "pre"
would receive raw `.astro` source — not parseable JS) or shipping a parallel style-tag
mechanism that reintroduces the process-global union problem (see 258) instead of riding
Astro's CSS collection.

# Evidence

Scratch probe this session: probe vite plugin in `examples/astro-islands/astro.config.mjs`
(enforce post, transform on `.astro` id, virtual `.css` resolveId/load) —
`bun run build` exit 0; `dist/index.html` carried `.probe-hero{color:red}` in an inlined
`<style>` after the page's `#hella-css` tag; compiled-module dump confirmed the
`$$createComponent` wrapper and hoisted imports. Probe reverted after; Astro 7.2.0,
static output. Dev-mode (HMR via addWatchFile + content-hashed virtual ids) and SSR-adapter
rendering are DoD-verified during the plan's execution, not yet probe-verified.
