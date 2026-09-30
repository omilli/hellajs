---
type: decision
title: Verify ui registry overlay positioning in a real browser, not the coverage gate
description: HappyDOM rects/offsets are all zeros, so anchorPosition-class bugs are invisible to bun coverage ui — reproduce with Playwright over the compiled registry dist and delete the fixture before gating.
tags: [ui, testing, positioning]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [registry-positioning, overlay-off-screen, happydom-zero-rects]
---
# Why
`packages/ui` tests run under HappyDOM, where `getBoundingClientRect`/`offsetWidth` return zeros — placement math (e.g. `anchorPosition` measuring the floating box before `position: fixed` applied, clamping x to 0) passes every gate while real Chrome puts the menu at the page's left edge. Only a real layout engine exercises the measure order.

# Evidence
2026-09-30 context-menu/dropdown first-open at left:0 — fixed in `packages/dom/lib/anchorPosition.ts` (position pinned before measuring); repro: Playwright (`channel: "chrome"`) + `Bun.serve` serving repo root, an import-map HTML page mounting the compiled `packages/ui/dist/registry/<name>/css/<name>.js`, `page.mouse.click(x, y, { button: "right" })`, then reading the content's inline `left/top`. Scratch `.ts` fixtures under `packages/ui/tests/fixtures/` FAIL `bun coverage ui`'s eslint stage — remove them before gating (verification already done by then).
