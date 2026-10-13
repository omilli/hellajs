---
type: decision
title: Virtual CSS module ids must resolve to their own specifier, never \0-prefixed — Astro dev dedupes SSR style vs client injection by exact data-vite-dev-id
description: Astro dev dedupes SSR style vs client injection by exact data-vite-dev-id; \0-prefixed virtual CSS ids break the match and ship css twice — resolve the bare specifier instead.
tags: [astro, css, dev-mode]
timestamp: 2026-10-13
last_confirmed: 2026-10-13
triggers: [virtual-css-module-id, dev-css-duplication, data-vite-dev-id, frontmatter-resolve-id]
---
# Why
Astro dev (`dist/core/app/dev/pipeline.js`) emits for every CSS dep in the page graph BOTH an inline `<style data-vite-dev-id={wrapId(mod.id)}>` and a `<script type="module" src={prependForwardSlash(wrapId(mod.url))}>`; vite's client (`client.mjs`) harvests existing `style[data-vite-dev-id]` elements into `sheetsMap` and `updateStyle(id)` reuses the element only on an EXACT id match. Normal `.css` files match (id = fs path both sides) so the script updates the SSR tag in place. `\0`-prefixed ids never match: `wrapId` renders the SSR tag's dev-id as `/@id/__x00__virtual:…` while the client module injects with the raw `\0virtual:…` — a duplicate `<style>` per module, visible pre-hydration (docs chrome css ×2 on every page; ui demo pages masked it because registry css rides `#hella-css`, not virtual modules — this is why "the UI components demo is fine" while every .astro-frontmatter-css component duplicated). Build was never affected: `inlineStylesheets: "always"` inlines once, no client injection. Fix (plugins/astro/frontmatter.mjs): `resolveId` returns the bare `virtual:hella-frontmatter/…` specifier itself and normalizes the leading-slash `/virtual:…` form Astro's script tag produces onto it (two module ids would re-duplicate); `load` matches the same key. Any future virtual CSS module in this repo follows the same rule.
# Evidence
Pre-fix Playwright probe (system Chrome, `astro dev`): /learn/ live DOM carried 6 SSR virtual style tags + 6 client-injected `\0`-id duplicates, 77 duplicate rules pre-hydration (96 on /ui/button/); dev-id attrs read from the DOM showed `/@id/__x00__virtual:…` vs `\0virtual:…`. Post-fix: same probe dup-rules=0 on /, /learn/, /reference/core/, /ui/button/, /plugins/; module script `/virtual:…` resolves 200; `astro build` 180-page sweep 0 duplicate rules, 0 stylesheet links; `astro preview` runtime probe 0 duplicates pre/post hydration; `bun test plugins/astro/tests` 26 pass, `bun lint` exit 0.
