---
type: decision
title: "Registry canonical formatting: adjacent html slots stay adjacent; JSX text children stay single-line"
description: "Never insert whitespace between adjacent html ${slot} expressions (becomes a real string child polluting textContent); JSX text-child elements stay single-line (JSX keeps newline-collapsed spaces)."
tags: [ui, registry, formatting]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [registry-canonical, html-template, jsx-formatting, style-module, add-output]
---
# Why

Both template languages have asymmetric whitespace semantics that pure reformatting can violate:

1. **html slot-adjacency**: text runs between tags are trimmed at the token level, but the
   INNER whitespace between two `${slot}` markers inside one text token survives as a
   whitespace string child (`"\n      "`). Consequence: item `textContent` gains trailing
   spaces, and `menuTypeahead`'s substring match (`text.includes(query)`) treats a Space
   keypress as matching every item — Space "activates" by re-focusing items[0] instead of
   clicking the focused item (dropdown-menu `activates items on Enter and Space` failed,
   html variants only).
2. **JSX text children**: JSX collapses newline+indent around bare text into single spaces
   and keeps them (`<h2>\n  Sidebar\n</h2>` renders `" Sidebar "`), while the html parser
   trims single text tokens. Sidebar's sr-only title assertion failed on the jsx variants
   only.

Safe splits (whitespace dies beside a tag): slot↔tag boundaries, tag↔tag chains, and
pure-whitespace text tokens. Unsafe: slot↔slot adjacency (html), bare-text reflow (jsx).

Canonical shape for multi-child depth-1 elements: `>` on its own line, then the whole
adjacent slot-run on ONE line at the children indent, then the close tag. Deep
single-expression children (no slot sibling) still go on their own lines.

# Evidence

- Transpiled child: `packages/ui/dist/registry/dropdown-menu/css/dropdown-menu-html.js` —
  `children: [() => props.children, "\n      ", () => props.shortcut …]` after a split.
- Parsers: `plugins/babel/src/parsers/text.mjs` pushes non-empty inner slices;
  `packages/dom/lib/internal/template.ts` `parseTextContent` identical (`if (!text)
  return []` only guards the whole token, trimmed).
- Failing test: `bun test packages/ui/tests/dropdown-menu.test.ts` — `Expected calls: 2,
  Received: 1` (html variants); `sidebar.test.ts:199` — `Expected "Sidebar", Received
  " Sidebar "` (jsx variants). Both green after the rejoin fix; `bun coverage ui` 2764/0.
- `menuTypeahead` substring path: `packages/dom/lib/menuTypeahead.ts`
  (`items[idx].text.toLowerCase().includes(search)`).
