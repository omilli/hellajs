---
title: "Navigation menu viewport parity facts: radix pointer-events inline, shadcn demo has no viewport or indicator"
description: "As of 2026-11-20 radix's viewport sets pointer-events:none inline when closed ('prevent interaction when animating out') and has no horizontal positioning logic; shadcn's registry exports NavigationMenuIndicator but their demo renders neither it nor a viewport (content goes inline under each item). Our registry wrapper needs pointer-events:none on BOTH the wrapper and the closed slot because the wrapper is our own extra layer over radix's structure."
tags: [navigation-menu, viewport, shadcn, radix, registry, parity, playwright]
confirmed: 2026-11-20
---
# Why

Proving these facts from scratch costs a Playwright session against shadcn's live site plus a registry-source fetch; unit 10 of the ui-demo-fixes set burned that once. Any future navigation-menu (or wrapper/overlay-style) unit triaging "panel in the wrong place" or "closed dropdown swallows clicks" needs these three facts.

# Facts

1. Radix (react-navigation-menu 1.4.1, `dist/index.mjs`) sets `pointerEvents: !open ? "none" : void 0` on the viewport element with the comment "Prevent interaction when animating out". A closed/exiting viewport must not intercept pointers, or it swallows clicks on page content below the bar (the original "demo code toggles misbehave" report).
2. Radix has NO horizontal viewport positioning: alignment comes entirely from the wrapper css. shadcn's wrapper (`absolute top-full left-0 flex justify-center`, no width) shrink-wraps, so panels sit at the bar's left edge unless the wrapper spans the bar and something offsets the slot. HellaJS aligns by stamping a clamped `translateX` on the wrapper from the Content's afterMount (the transform must ride the wrapper: the slot's enter/exit keyframes animate `transform` and would override an inline translateX).
3. shadcn's registry EXPORTS `NavigationMenuIndicator` (the diamond: `top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md`) but their primary demo renders `Root > List > Item > Trigger > Content` only, and their demo page has no viewport at all (content renders inline under each item). Demo-parity therefore means: no indicator element, hover-open triggers, no diamond on the playground page.

# Gotcha

Our Viewport part renders an extra wrapper div over radix's structure, so the radix pointer-events rule must be applied twice: the wrapper carries `pointer-events: none` permanently (it is a full-bar-width overlay at z-50 once `width: 100%` made it span the bar) and the slot regains `pointer-events: auto` only in `data-state='open'`. Setting it on the slot alone leaves the wrapper intercepting (Playwright: "navigation-menu-viewport-wrapper ... intercepts pointer events").

# Evidence

- `curl https://unpkg.com/@radix-ui/react-navigation-menu@1.4.1/dist/index.mjs` — pointerEvents inline + no positioning logic.
- `curl https://ui.shadcn.com/r/styles/new-york-v4/navigation-menu.json` — registry source: wrapper classes, indicator export, demo without indicator/viewport.
- Playwright against ui.shadcn.com docs page: hovering triggers opened content nodes with zero clicks and zero indicator nodes; the demo DOM contains no viewport slot.
