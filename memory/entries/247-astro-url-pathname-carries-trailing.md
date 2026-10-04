---
type: fact
title: Astro.url.pathname carries a trailing slash at build time — exact-match active routes must normalize it
description: Under build.format directory, compare pathname.replace(/\/+$/,"") against nav urls; the daisy-era docs nav compared raw and its exact-match highlighting never fired.
tags: [astro, docs-site, routing]
timestamp: 2026-10-03
last_confirmed: 2026-10-03
triggers: [active-route, astro-url-pathname, trailing-slash, docs-nav, nav-highlight]
---
# Why

`docs/astro.config.mjs` sets no `trailingSlash`/`build.format`, so Astro's
defaults apply (`format: "directory"`) and `Astro.url.pathname` during
prerendering ends with `/` — while nav urls built from page globs
(`/learn/concepts/reactivity`) don't. Exact equality (`pathname === url`)
therefore never matches: every `data-active`/`aria-current`/`menu-active` hook
computed from the raw pathname is silently dead (no error, no warning — the nav
just never highlights). The daisy-era `Sidebar.astro`/`NavItem.astro` shipped
this bug: the pre-change build's nav links carry `aria-current="false"`
throughout. `startsWith` checks (section-level highlighting) are immune, which
is why partial highlighting masked it. Site-foundation 09 normalizes once in
`docs/src/chrome/DocsNav.astro` and threads the stripped value everywhere;
unit 10's navbar active states inherit the rule. Also confirmed working: index
routes (`/learn` → stripped `/learn`) match their main-nav link.

# Evidence

2026-10-03, worktree plans-docs-misc-site-foundation unit 09: post-first-build
probe — `rg -c 'data-active="true"' docs/dist/learn/concepts/reactivity/index.html`
= 1 (only the startsWith "Learn" link); the page's own leaf link rendered
`<a href="/learn/concepts/reactivity" class="site-menu-link">` with no
`data-active`. Old build same defect:
`rg -o 'href="/learn/concepts/reactivity"[^>]*'` on main-tree
`docs/dist/learn/concepts/reactivity/index.html` → `aria-current="false"`.
After the normalize in DocsNav.astro: the leaf link renders
`data-active="true" aria-current="page"`, the parent group summary renders
`data-active="true"`, and `/learn/index.html` highlights its main-nav link —
`cd docs && bun run build` exit 0, route set unchanged (181 pages).
