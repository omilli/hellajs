---
title: Exclude docs page mdx-component imports from registry-name sweep rg patterns
description: "Doc-page wrappers import .mdx documents as components aliased to export-like names, so a repo-wide rg sweep over 'packages/<pkg> docs/src' for removed export names never reaches exit 1 - append -g '!docs/src/pages/**' and eyeball the wrapper matches instead of treating exit 0 as a stale reference."
tags: [ui, docs, sweep, rg, false-positive, doc-pages, mdx, removal]
confirmed: 2026-10-31
---
# Why

Removal sweeps verify completion with a repo-wide `rg` over the package and the
docs site for the deleted export names. The check can be unwritable as stated:
`docs/src/pages/ui/<name>.astro` renders the package concepts page via
`import <Name><Section> from "@ui/concepts/<name>.mdx"`, and
`docs/src/pages/headless/<name>.mdx` imports headless API docs via
`import <Name><Section> from '@headless/api/<name>.mdx'` - both are local
aliases of compiled markdown documents, chosen freely by the wrapper author,
and they collide with registry export names (e.g. `MessageScrollerContent`).
Those lines predate any sweep, reference no registry symbol, and are untouchable
within a package delta, so the literal command stays exit 0 forever and an
unattended runner either fails the unit or papers over the DoD. The documents
aliased this way are also the ones a sweep legitimately edits - the alias name
survives a content rewrite.

# Evidence

`rg -n 'MessageScrollerProvider|MessageScrollerViewport|MessageScrollerContent|MessageScrollerButton' packages/ui docs/src` (2026-10-31),
after all four registry parts were deleted and every regenerated file verified
clean, still exits 0 on exactly four lines: `docs/src/pages/ui/message-scroller.astro:4,26`
(`import MessageScrollerContent from "@ui/concepts/message-scroller.mdx"` -
astro config maps `@ui/*` to `../packages/ui/docs/*`) and
`docs/src/pages/headless/messagescroller.mdx:7,9` (`from
'@headless/api/message-scroller.mdx'`). Refined command with
`-g '!docs/src/pages/**'` exits 1. Verification ritual for any
removal/rename sweep naming doc files: run the sweep with the pages exclusion,
then read the excluded wrapper matches to confirm each is an mdx-document
import rather than a symbol reference.
