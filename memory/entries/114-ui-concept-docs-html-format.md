---
type: decision
title: Ui concept docs' html-format recipe blocks are sanctioned build-free-runtime blocks
description: §Example Syntax permits html`` blocks in ui concept docs teaching the copied --format html file, as build-free-runtime recipe blocks; js tag, single syntax, </${Component}> closers.
tags: [docs, ui, guides]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [concept-doc, html-fence, example-syntax, shadcn-page-format]
---
# Why

§Example Syntax (JSX Default) enumerates two homes for html`` blocks: the html-method doc (`api/html.mdx`) and "recipe blocks targeting a build-free runtime: server entries pairing `router({ url })` with `ssr`". The enumeration names only the server instance, so auditors and workers can misread the rule as banning ui concept-doc html fences and strip them or flag violations. The category language covers the ui instance by its own words: a `--format html` copied component file runs with no build plugin transpiling JSX (pure runtime, no compiler), so a fence teaching its usage is exactly a build-free-runtime recipe block. Units 05-13 of the shadcn-page-format set each face this boundary; re-deriving it per unit wastes an audit round and risks a wrong strip. The boundary conditions that keep a block sanctioned: `js` language tag, never mixed syntaxes in one block, `</${Component}>` closers (never `<//>`), and only where the html shape teaches something the jsx does not (parts-as-function-calls; not tag-identical usages). If the set later wants the enumeration to name the ui instance, that is a one-clause guide edit via `feedback`, not a fence removal.

# Evidence

guides/docs.md §Example Syntax (JSX Default), category sentence "recipe blocks targeting a build-free runtime ... where no build plugin transpiles JSX"; root AGENTS.md §docs ("css flavor, html format, pure runtime, no compiler"); unit 02 pilot `packages/ui/docs/concepts/accordion.mdx` html fence (gate-green, operator-accepted); unit 04 alert.mdx and empty.mdx html fences passed `bun doc-snippets` strict tier (exit 0) and the shared gate (build 168 pages, all guards green) on 2026-09-27.
