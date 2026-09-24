---
type: decision
title: Close dynamic html-template component tags with `</${Component}>` — `<//>` parses as text
description: In runtime html`` templates the only valid dynamic-component close is the interpolated `</${Component}>` form; the `<//>` short form is not a tag and leaks literal `//>` text into the render.
tags: [dom, html-templates]
timestamp: 2026-09-18
last_confirmed: 2026-09-22
triggers: [html-close-form, dynamic-component-tag, template-parser, component-syntax]
---
# Why

`packages/dom/lib/internal/template.ts` `TOKEN_REGEX` (`/<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g`) matches tag names of `[\w-]+` only — `<//>` cannot parse as a closer, so its trailing `//>` falls through to the text branch and lands in the DOM as visible residue (renders as `//&gt;`). Interpolated closers travel the slot path instead: `</${Component}>` becomes `</__SLOT_N__>`, which the stack walker matches against the nearest open dynamic component (`parseHTML`'s `isSlotCloser` branch). Static attributes map verbatim into the component's props (`onclick=${fn}` → `props.onclick`), tag children become `props.children`, and function children/props stay functions (accessor props like `DialogProps.open: () => boolean` receive the signal itself). Self-closing `<${Component} prop=${v} />` is valid for childless components. All `<//>` instances were eradicated 2026-09-22 — package docs and docs-site demo pages on main and in the shadcn worktree rewritten to the stack-matched `</${Component}>` form (one demo page also dropped two structurally-extra closers that had shut `Field` before its inputs). The close-form rule is codified in `guides/code.md` §Templates and `guides/docs.md` §Example Syntax → Dynamic Component Closes.

# Evidence

Probe under happy-dom (`bun --preload utils/happydom.js`), Unit 14 session: `<${Inner} label="a">x<//>` rendered `<span> x//&gt;</span>` (stray text) while `<${Inner} label="b">y</${Inner}>` rendered clean; nested dynamic tags, thunk children, and self-closing forms all verified. Source: `packages/dom/lib/internal/template.ts` `TOKEN_REGEX` + the `isSlotCloser` stack walk; `packages/dom/docs/concepts/components.mdx` §Component Syntax documents `</${MyComponent}>`.
