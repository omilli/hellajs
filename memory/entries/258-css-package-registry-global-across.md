---
type: decision
title: "The css package registry is global across the astro build process — a docs layout must import its own full registration set or its cssText() head is nondeterministic"
description: "cssText() emits whatever registered earlier in the shared build process; a docs layout must import its own full registration set or its head tag content depends on page render order."
tags: [docs, build, css]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [docs-head-styles, cssText-landing, astro-build-order, css-registry-leak]
---
# Why

`css()`/`style()`/`vars()` registrations live in a process-global registry.
During `astro build`, pages render sequentially in one process with a shared
module cache: after the first MainLayout page renders, prose/chrome rules are
registered forever. A layout that calls `cssText()` without importing those
modules itself therefore emits whatever earlier pages happened to register —
LandingLayout originally emitted only tokens, later rendered `main a`
(prose) with its underline onto the landing CTAs, depending on build order.
The rule: every layout emitting a `cssText()` head tag imports the SAME
registration set itself (MainLayout: prose + chrome-css + tokens; LandingLayout:
the same minus demoCss), making the head deterministic regardless of build
order. A vars-only collector does not exist in the css package, and
`resetCss()`-based scoping would break later sibling pages (the cache holds).

# Evidence

Unit 11 (site-foundation set): landing CTAs rendered underlined — Playwright
computed `main a { text-decoration: underline }` (prose, unlayered) arriving
from the shared registry via LandingLayout's `cssText()`; after importing
prose + chrome-css in LandingLayout itself, the head content is stable across
rebuilds (`docs/dist/index.html` head, byte-identical composition to
MainLayout's minus demoCss).
