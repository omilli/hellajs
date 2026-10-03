---
type: correction
title: A static style tag first in the document owns @layer ordering — SSR-emitted cssText must open with an exhaustive layer statement
description: SSR style tags precede linked stylesheets, so their @layer blocks first-declare layers before tailwind's and base beats class rules — open them with an exhaustive layer statement + the element id.
tags: [css, docs-site, arch]
timestamp: 2026-02-14
last_confirmed: 2026-02-14
triggers: [layer order, cssText SSR, style tag adoption, cascade layers, demo styles]
supersedes:
---
# Why
Cascade layer order is fixed by each layer name's FIRST occurrence in the document, and ranks above specificity. An SSR-emitted `<style>` tag precedes astro's injected stylesheet `<link>`s, so its `@layer hella{…}` blocks first-declare `hella` before `properties, theme, base, components, utilities, daisyui*` — tailwind's base (element defaults: `border: 0`, transparent background) then beats `.hella-*` class rules. Playwright-verified on the docs build (hero button computed `border: 0px` / `background: rgba(0,0,0,0)`). Fix: the tag opens with `@layer properties, theme, base, components, utilities, daisyui, daisyui.l1, daisyui.l1.l2, daisyui.l1.l2.l3, daisyui.l1.l2.l3.l4, hella;` (exhaustive — a missed rule-bearing layer first-declares later and outranks hella) and carries `id="hella-css"` so `packages/css` sheet lookup (`sheet.ts` getSheet, `getElementById`) adopts it instead of injecting a duplicate element; adoption must DRAIN pre-existing rules (client `indexMap` doesn't know them; `upsertRule` miss-path inserts blindly; browser cssText re-serialization makes byte-matching unreliable). Also verified: `cssText()` is process-global and astro static builds render pages sequentially (`build.concurrency` default 1) — per-page collection at render time accumulates a cross-page superset (measured 2.6KB → 206KB monotonically); per-page CSS must be pre-generated with resetCss() isolation (text-keyed identity makes diffing impossible).

# Evidence
Playwright probe (repo playwright + system Chrome over `astro preview` of the worktree build, 2026-02-14 session): computed styles + `document.styleSheets` owner scan (button class in 8 rules × 2 style tags); built-HTML head order (static tag first, links after); tailwind layer statement order extracted from the linked css; astro `generate.js` sequential path + `defaults.js` `concurrency: 1`. Fix contract: `plans/docs/misc/demo-pipeline/07-style-pipeline-round2.md` (ephemeral; durable home = css docs `csstext.mdx` SSR section + docs AGENTS file map once landed).
