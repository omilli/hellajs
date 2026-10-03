---
type: fact
title: "HappyDOM never parses <style> textContent into a sheet — SSR-shaped style elements are unseedable in css tests; statement-survival contracts are Chrome-only observable"
description: "textContent yields sheet.cssRules.length 0 under happy-dom and statement insertRule is rejected (128), so a drain that must PRESERVE statements is only verifiable in a real browser."
tags: [testing, css, cssom, happydom]
timestamp: 2026-10-03
last_confirmed: 2026-10-03
triggers: [ssr-sheet-seeding, style-textcontent, statement-preservation, adoption-drain, happydom-sheet-limits]
---
# Why

Testing CSSOM adoption (a pre-existing element carrying SSR rules that the client must drain) needs a way to seed "an element with rules". Under happy-dom the only working seed is direct `el.sheet.insertRule(...)` of braced rules; `textContent` is never parsed into the sheet (rules stay 0), and block-less statements are rejected on insert (128 — the fake-sheet stub covers client-side placement, but the real adoption path runs against a real sheet). Consequence for contract design: a drain that keeps statement rules (a leading `@layer a, b;` order statement is what holds `hella` ranked after the linked stylesheet's layers post-hydration) cannot be pinned by a happydom test at all — pin what happydom can express (braced drain, element reuse, indexMap integrity) in tests and assert the statement-survival half with a Playwright probe against the built site, and say so in the plan's test contract.

# Evidence

Probe this session (worktree plans-docs-misc-demo-pipeline, unit 07): `el.textContent = "@layer base, hella;.a{color:red}"` + appendChild → `el.sheet.cssRules.length === 0`; `insertRule("@import url(\"x.css\")", 0)` warns and inserts nothing (128's finding). The shipped shape: `packages/css/tests/adoption.test.ts` seeds via `insertRule` (braced only) while the statement-preservation assertion lives in the unit's Chrome DoD probe (default-button background flips to transparent when the layer statement is drained — observed pre-fix, oklch post-fix).
