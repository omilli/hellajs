---
type: decision
title: "Docs static head tag id is `site-head` — never the css runtime's `hella-css`"
description: "The css runtime adopts+drains any #hella-css tag at first client registration; the docs SSR head uses a foreign id so hydration can never strip the SSR styles."
tags: [css, docs-site, hydration]
timestamp: 2026-06-27
last_confirmed: 2026-06-27
triggers: [docs-island, style-flash, css-adoption, head-stylesheet]
---
# Why
`adoptElementRules` (packages/css/lib/internal/sheet.ts) drains every braced rule
from the SSR-emitted `#hella-css` element at the first client registration and
repopulates only what the client module graph registers. Any page whose first
hydrating island does not re-register the site css flashes an unstyled window:
docs pages went "styled → funky" when unit 10's SearchPalette became their first
island, and /ui pages kept a ~25ms flicker because demo islands register first
(Astro hydrates islands by independent module loads — DOM order guarantees
nothing). The demo-pipeline contract deliberately chose the `hella-css` id to
fire adoption; that contract was amended in unit 10 (user-approved): adoption's
only benefit is dedupe, and byte-identical duplicate rules are invisible, while
the drain flashes are not.
# Evidence
Frame-by-frame getComputedStyle sampler at 6× CDP CPU throttle (unit 10 review
gate): /ui/command flipped styled→unstyled→styled at 462ms/620ms pre-fix; after
renaming MainLayout's head tag to `site-head`, /, /ui/command/, and docs pages
each show exactly one stable state from first paint. site-head stays 17704 bytes
across hydration; the runtime creates its own #hella-css (22 command rules).
