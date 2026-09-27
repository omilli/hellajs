---
type: decision
title: "Html canonicals host reactive Portal children under an element root — a bare `html`${fn}`` template never mounts them"
description: A root-level reactive expression in an html`` template (no element root) silently renders nothing; wrap the portal in a display:contents element (direction precedent).
tags: [arch, ui, registry, contract]
timestamp: 2026-09-19
last_confirmed: 2026-09-27
triggers: [html-template-root, reactive-portal-child, display-contents-wrapper, navigation-menu-content]
---
# Why
The html template engine wires `${fn}` bindings for children of an ELEMENT root; a template whose
entire body is one reactive expression has no element to bind on, so the child never mounts — the
component renders empty with no error. The jsx flavor is unaffected: a fragment `<>{() =>
Portal(...)}</>` compiles through the jsx transform and works. Any html-format part whose rendered
panel is a Portal (no natural host element, e.g. a content panel portaling into a shared slot) must
host the reactive child in a layout-neutral element. Established precedent: DirectionProvider wraps
with `display: contents` so the wrapper stays out of layout
(`registry/direction/direction-html.ts`); applied the same shape to NavigationMenuContent
(`registry/navigation-menu/`): a `[display:contents]`/`style({display:"contents"})` anchor div
carrying `${() => visible() && Portal({...})}`.

# Evidence
- Repro this session: NavigationMenuContent html flavor as `html`${() => visible() && Portal(...)}`
  `` mounted 0 `[data-slot=navigation-menu-content]` nodes after activation (signal flipped, no
  crash); after adding the contents-host wrapper the same flow portals and mounts (suite 34/34).
- Convention cross-check: every delivered html canonical renders conditional portals inside an
  element root (dropdown-menu/popover render `${() => s.visible() && Portal(...)}` inside the
  trigger button); `resolveNode` stringifies function children in ARRAYS as text, so a function
  child is not an alternative host-free shape.
- Gate: `bun coverage ui` exit 0 after the wrapper fix (1907 tests, 0 fail).
