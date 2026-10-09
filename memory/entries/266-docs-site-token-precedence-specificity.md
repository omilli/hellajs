---
type: decision
title: Docs-site token precedence is specificity-based, never registration order
description: Site tokens use `vars(palette, { scoped: "html:root" })`: (0,1,1) beats every registry `:root` (0,1,0) sheet regardless of order - island hydration registers registry vars after the static head.
tags: [arch, css, docs-site]
timestamp: 2026-10-04
last_confirmed: 2026-10-08
triggers: [docs-site, cascade-precedence, island-hydration, vars-registration, theme-tokens]
---
# Why

Both the registry theme sheet and the docs-site tokens are unlayered `:root`-family
declarations now (the unprefixed-classes set dropped every `layer: "hella"` /
`@layer` registration). With equal specificity, last-writer-wins hands conflicted
tokens to whoever registers later — and island hydration registers the registry
vars sheet client-side AFTER the static site-head tag, so an order-based guarantee
is false on every `/ui/*` page: `--primary` computed to the registry's dark
`oklch(0.922 0 0)` and the sidebar module's own light `--sidebar*` vars
(`packages/ui/registry/sidebar/sidebar-css.ts`, top `vars()` call) overrode the
site chrome. The fix is specificity, not order: `scoped: "html:root"` is an
existing public option (`packages/css/docs/api/vars.mdx` §Options,
`resolveVarsOptions` in `packages/css/lib/internal/vars.ts`), the (0,1,1) block
beats every `:root` (0,1,0) registration regardless of order or document
position, and the demos run exactly what `add` copies (the retired `demo-kit.ts`
copier is gone; islands now reference tokens through the site sheet's
exported object). The palette probe (gitignored Playwright
script over `astro preview`) is the guard — a failure there is a set-design fork,
not a styling bug to patch. Supersedes the ordering architecture described in
entry 243 (its formal supersede is a post-set event).

Since the tokens-js set (unit 03, verified 2026-10-08) island hydration also
re-registers the SITE sheet client-side (demo islands import
`../styles/tokens` for token refs) — same (0,1,1) specificity and identical
values, so the guarantee is order-independent on both sides. The astro plugin's
frontmatter extraction discards extracted vars() sheet copies entirely
(`plugins/astro/evaluate.mjs`): the sheet's static delivery stays the layout's
`cssText()` flush, one block per page.

# Evidence

Verified 2026-10-08 in worktree plans-ui-code-tokens-js (unit 03): built
`docs/dist/ui/sidebar/index.html` carries exactly one `--base-contrast:` site
sheet block (the flush), with demo/component rules present as `var(--*)`
literals in the bundled css. Prior verification 2026-10-04 in worktree `plans-css-code-unprefixed-classes` (unit 02 of
plans/css/code/unprefixed-classes): Playwright probe over `astro preview`, 7/7
PASS — body bg rgb(11, 16, 30) identical on `/learn/` vs `/ui/button/`;
`--primary` = `#38EBFF` (site value, not registry `oklch(0.922 0 0)`);
default-variant demo button rgb(56, 235, 255); `.site-nav` rgb(8, 12, 23) on
`/ui/sidebar/` (contested page: registry sidebar module registers its light
`--sidebar*` vars client-side) matching `/learn/`, not registry light
`oklch(0.985 0 0)`. Source: `docs/src/styles/tokens.ts` registers with
`{ scoped: "html:root" }`; `resolveVarsOptions` defaults scope to `:root`
(`packages/css/lib/internal/vars.ts`).
