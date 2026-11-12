---
title: Rename/removal plan sweeps must cover all packages' docs code examples
description: An API consumed by sibling-package docs code examples breaks those examples silently - scope rename/removal rg sweeps over every packages/*/docs tree, not just the owning package, examples, and skills rules.
tags: [sweep, blast-radius, cross-package, docs, rename, plans]
confirmed: 2026-11-12
---
# Why

A plan scoped to the owning package plus examples and skill rules can still leave a live call to the removed API in a sibling package's published docs code block. Sibling docs routinely demonstrate their own feature through another package's API, so a rename in package A invalidates code fences in package B's docs even when A's own docs are clean. The stale fence ships to users as a non-compiling example; no package-scoped gate catches it (doc guards check structure/links/typography, not cross-package API drift), and doc-snippets only typechecks fences per its own tiering.

# Evidence

Removing the `@hellajs/dom` wrapper `bind()` method (split into `text()`/`attr()`, 2026-11-12): the plan's sweep covered `packages/dom`, `examples/`, and `.agents/skills/dom-best-practices/rules/` and concluded clean, but `rg '\.bind\(' packages/ docs/src --glob '!*.d.ts'` across ALL packages surfaced `packages/ssr/docs/patterns/ssr.mdx:108` calling `span.bind(() => String(count()))` on a dom `DomRef` - a live call to the removed API in the ssr patterns doc. The fix (`span.text(...)`) was found only by the post-edit cross-package sweep; a full-packages sweep at plan-authoring time would have listed the file up front.
