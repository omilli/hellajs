---
type: decision
title: Docs SSR head tags are the adoptable `hella-css`/`hella-vars` ids — claim-based adoption removed the drain flash
description: Both docs layouts emit `cssText.css()` / `cssText.vars()` through id'd hella-css/hella-vars tags; adoption claims instead of draining, so hydration never empties the sheet.
tags: [css, docs-site, hydration]
timestamp: 2026-10-10
last_confirmed: 2026-10-10
triggers: [docs-island, style-flash, css-adoption, head-stylesheet, cssText]
supersedes: 254
---
# Why
254 chose the foreign `site-head` id because `adoptElementRules` then DRAINED every braced rule before repopulating — any page whose first island did not re-register the site css flashed unstyled. Claim-based adoption (raw-text match into `indexMap`, claims parse-probe-aligned) deletes nothing on the claim path, so the flash rationale is gone and the docs head tags carry the runtime ids again: MainLayout + LandingLayout emit `<style id="hella-css">` (always) and `<style id="hella-vars">` (when vars text is non-empty) from the `cssText` namespace members (`cssText.css()` / `cssText.vars()`; the deleted `cssTextParts()` export folded into it pre-release). Delivered rules nothing re-registers (astro-folded frontmatter css, layout-owned preflight/global/prose) now SURVIVE hydration instead of duplicating — the drain fallback fires only when the delivered text cannot be aligned with the sheet at all.
# Evidence
Playwright/Chrome probe over `astro preview` of the docs build (2026-10-08 worktree run): `/`, `/learn/`, `/ui/button/`, `/ui/command/`, `/ui/sidebar/` — `dupCount === 0` everywhere and `#hella-css` rule counts identical at `domcontentloaded` vs post-hydration (1779, 193, 550, 745, 1600). Under the pre-amendment count-equality guard the same probe showed the drain (193 → 49 on /learn/; body line-height 24px → normal).
