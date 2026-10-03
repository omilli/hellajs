---
type: fact
title: "Registry source comments surface in built ui pages; scope upstream-scrub greps to the mdx tree"
description: docs/dist ui pages for calendar/sidebar match "the ref" via registry comments in install-source blocks — grep scrub state in packages/ui/docs/concepts, never built pages.
tags: [ui, docs, guards]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [component-docs, built-page-grep, install-sources, upstream-scrub]
---
# Why

The registry canonical files carry upstream-comment references ("the ref's useSidebar", "the ref's keyboard shortcut") in code comments, and the docs site renders those files verbatim in install-source blocks — all four generated variant dirs under `docs/src/generated/install/` (css-jsx, css-html, tailwind-jsx, tailwind-html; since the docs-demo-pipeline vendor exit, css-html is generated too, so built pages read generated install dirs only) → the page's InstallSection. Any grep for `shadcn|Radix|the ref` over `docs/dist/ui/*/index.html` therefore false-positives on calendar and sidebar even when every component concept doc is scrubbed clean. The component-docs scrub contract (guides/docs.md §Concept Docs → Rules, and the component-docs-modernization set's aggregate DoD) scopes its rg to `packages/ui/docs/concepts` — that scoping is load-bearing, not cosmetic; widening the grep to built pages or registry sources turns a green state into phantom findings and invites out-of-contract edits to registry files (unit 01's surface).

# Evidence

Verified 2026-09-30, worktree plans-ui-docs-component-docs-modernization after unit 08: `rg -l 'shadcn|new-york|the ref' docs/dist/ui/{calendar,sidebar}/index.html` matches both, while the same pattern over `packages/ui/docs/concepts/*.mdx` (all 59 components) exits 1; `rg -o 'the ref' docs/dist/ui/sidebar/index.html` counts 40, all inside syntax-highlighted comment spans traced to `packages/ui/registry/sidebar/sidebar-html.ts` and `calendar-html.ts` comments (e.g. "the ref's useSidebar", "the ref's keyboard shortcut") carried through the generated install-source files; the other seven unit-08 pages (attachment, bubble, message, message-scroller, slider, table, tabs) build clean because their registry sources carry no such comments. Re-confirmed 2026-10-02, worktree plans-docs-misc-demo-pipeline unit 05: the mechanism survives the vendor exit unchanged — every install-source block (css-html included) now comes from the generated variant dirs, so the scoping rule holds a fortiori.
