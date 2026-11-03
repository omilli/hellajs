---
title: "Author headless docs demos as minimal self-contained slices"
description: "Headless docs-site demos keep one style() inside the export function with raw values and only behavior-critical rules, so the sliced View Code card is copy-paste-complete; full names, never abbreviations."
tags: [headless, docs-site, demos, style, view-code, authoring]
confirmed: 2026-01-29
---
# Why

The user rejected the first demo generation twice over: too much styling (module-level style() palettes with var(--*) tokens, button chrome, hover states) and abbreviated locals (`const Acc`, `const Col`). The binding contract is the user-rewritten accordion demo: one `style()` call inside the `export function <Name>Demo()` body, a root width plus nested `.content`-style rules with `[data-state]` visibility, `opacity`/`fontSize` for muted text, and nothing else. Style calls and any referenced constants must live inside the export because `demoCode` slices only the export block for the View Code card — module-level styles or consts (avatar data URIs, item arrays) silently drop out of the copy-paste surface. Raw values only, no `var(--*)` tokens (one sanctioned exception: component-published runtime vars like the navigation-menu viewport height); portaled surfaces (dialog/popover/menu panels, toaster) get a minimal opaque palette (`#1c1c26` bg, `#e8e8f2` text, `zIndex >= 10`) since they mount in document.body outside the demo root and would render as transparent floating text; active/selected/checked state uses `#e8e8f2` bg with `#18181f` text. Factory locals use the full export name (`const Accordion = accordion(...)`, `const MessageScroller = messageScroller(...)`); semantic instance names (`File`, `Updates`) are fine, abbreviations are not.

# Evidence

User direction plus the rewritten `docs/src/demos/headless/accordion-demo.tsx` exemplar (2026-01-29); the 41-demo rewrite to this shape passed `vp run lint`, `astro build`, and a Playwright sweep (mount + interaction + zero console errors on all `/headless/*` pages) against the built site. View Code slicing completeness verified in the built HTML: the `export function AccordionDemo()` block including the inline `style()` renders in the details card.
