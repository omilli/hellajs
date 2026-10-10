---
type: decision
title: Docs-site token precedence is specificity-based, never registration order
description: Site tokens use `vars(palette, { scoped: "html:root" })`: (0,1,1) beats every registry `:root` (0,1,0) sheet regardless of order - island hydration registers registry vars after the static head.
tags: [arch, css, docs-site]
timestamp: 2026-10-08
last_confirmed: 2026-10-08
triggers: [docs-site, cascade-precedence, island-hydration, vars-registration, theme-tokens]
---
# Why

Both the registry theme sheet and the docs-site tokens are unlayered `:root`-family
declarations now (the unprefixed-classes set dropped every `layer: "hella"` /
`@layer` registration). With equal specificity, last-writer-wins hands conflicted
tokens to whoever registers later — and island hydration registers the registry
vars sheet client-side AFTER the static `hella-css`/`hella-vars` head tags, so an order-based guarantee
is false on every `/ui/*` page: `--primary` computed to the registry's dark
`oklch(0.922 0 0)` and the sidebar module's own light `--sidebar*` vars
(`packages/ui/registry/sidebar/sidebar-css.ts`, top `vars()` call) overrode the
site chrome. The fix is specificity, not order: `scoped: "html:root"` is an
existing public option (`packages/css/docs/api/vars.mdx` §Options,
`resolveVarsOptions` in `packages/css/lib/internal/vars.ts`), the (0,1,1) block
beats every `:root` (0,1,0) registration regardless of order or document
position, and `docs/src/demos/demo-kit.ts` keeps importing `tokens.dark.js` so
demos run exactly what `add` copies. The palette probe (gitignored Playwright
script over `astro preview`) is the guard — a failure there is a set-design fork,
not a styling bug to patch. Supersedes the ordering architecture described in
entry 243 (its formal supersede is a post-set event).

# Evidence

Verified 2026-10-04 in worktree `plans-css-code-unprefixed-classes` (unit 02 of
plans/css/code/unprefixed-classes): Playwright probe over `astro preview`, 7/7
PASS — body bg rgb(11, 16, 30) identical on `/learn/` vs `/ui/button/`;
`--primary` = `#38EBFF` (site value, not registry `oklch(0.922 0 0)`);
default-variant demo button rgb(56, 235, 255); `.site-nav` rgb(8, 12, 23) on
`/ui/sidebar/` (contested page: registry sidebar module registers its light
`--sidebar*` vars client-side) matching `/learn/`, not registry light
`oklch(0.985 0 0)`. Source: `docs/src/styles/tokens.ts` registers with
`{ scoped: "html:root" }`; `resolveVarsOptions` defaults scope to `:root`
(`packages/css/lib/internal/vars.ts`).
