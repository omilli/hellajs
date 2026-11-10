---
title: Snapshot span nodes before cleanup - detached nodes null their sibling pointers
description: Never live-walk DOM siblings across a cleanup pass - collect the span first, because any node a cleanup detaches reads previousSibling null and kills the walk.
tags: [dom, cleanup, sibling-walk, detached-nodes, reactive-region]
confirmed: 2026-11-09
---

# Why

`removeChild` (spec behavior, happy-dom and Chrome alike) clears the detached node's
`previousSibling`/`nextSibling`. Any backward sibling walk that interleaves
`cleanupSubtree(node)` with `node = node.previousSibling` breaks when an earlier node's
cleanup detaches nodes still ahead in the walk: the walk lands on a detached node, reads
`previousSibling === null`, and exits its `while (node ...)` loop early - stranding every
live node between the detached block and the walk's start marker. In
`packages/dom` `clearRegionSpan` this stranded the leading children of a reactive region
(a static SearchBar div plus a nested region's lead marker) whenever the span contained a
ForEach whose anchor cleanup removes its own items: navigating `/posts` -> `/posts/:id`
in the blog example left the search bar rendered on the post-detail page. Collect the
span into an array before any cleanup runs, then cleanup+remove from the snapshot,
keeping the `parentNode === parent` guard for nodes a cleanup already removed or moved.

# Evidence

Empirical repro before the fix: Playwright probe of the blog example (`examples/blog`)
navigating `/posts` -> clicking a post: MutationObserver log showed `clearRegionSpan`'s
walk stop right after the ForEach anchor's cleanup batch-removed its items, leaving the
SearchBar div in the DOM. Fix (snapshot walk in `clearRegionSpan`,
`packages/dom/lib/internal/render.ts`) verified by `vp run coverage dom` (exit 0) plus
the regression test "a cleanup that detaches span siblings mid-walk does not strand the
span's leading nodes" in `packages/dom/tests/reactive-region-span.test.tsx`.
