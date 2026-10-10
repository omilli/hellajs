---
type: decision
title: Dedup build-delivered vs runtime-registered CSS through the hella-css adoption seam, never CSSOM document scanning
description: "esbuild reorders declarations, so cssText never matches across channels (values normalize per-engine, order does not) — dedup build vs runtime CSS via adoption drain, never document scans."
tags: [css, astro-plugin, cssom]
timestamp: 2026-10-08
last_confirmed: 2026-10-08
triggers: [css-text-dedup, adoption-seam, cssom-scan-rejected, minified-css-match]
---

# Why

When the same rule ships through a build pipeline (Astro's virtual CSS import, minified) AND registers at runtime (`registerText` pretty-printed), the css package cannot recognize the delivered copy: exact `cssText` equality fails because the minifier reorders declarations while the CSSOM preserves parse order; value serialization itself normalizes identically per engine (`#eff6ff` → `rgb(239, 246, 255)`, `.5rem` → `0.5rem`), so only a declaration-set comparison could match — and that rests on minifier behavior nothing guarantees (reordering across overriding pairs, shorthand expansion under lightningcss, at-rule restructuring), costs O(all document rules) per registration, throws on cross-origin `<link>` sheets, and is cascade-blind (`@layer`/`@media` wrappers). The reliable seam is ownership: deliver the rules the runtime will re-register inside a `<style id="hella-css">` the runtime knows how to adopt (2026-10: `adoptElementRules` claims delivered rules by raw-text match into `indexMap` — claims parse-probe-aligned, nothing deleted on the claim path; the drain survives only as the text/sheet-divergence fallback), and deliver rules nothing re-registers through the page's own pipeline (the plugin's MINIFIED pageCss rides that pipeline — minified text cannot claim, and nothing re-registers it).

# Evidence

- Live Playwright/Chrome probe against built `examples/astro-islands` (2026-10-05): after hydration the `.h-counter-btn-aiytbh` rule exists in both Astro's anonymous pipeline tag and the runtime `#hella-css` tag; `exactMatch: false` (astro copy serializes `cursor` first, runtime copy `padding` first — source order), declaration sets equal after same-engine parsing.
- `packages/css/lib/internal/sheet.ts` `adoptElementRules` + `packages/css/tests/adoption.test.ts`: pre-existing element drained once, identical registrations repopulate without duplicates.
