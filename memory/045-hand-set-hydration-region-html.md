---
title: Hand-set hydration region HTML must use exact <!--[--> and <!--]--> markers
description: "A malformed region-marker comment (e.g. `<!--[->>`, one dash short) silently parses as one big comment node — hydrate then finds no `[` marker and no-ops without warning; verify marker encoding first when hand-set server HTML fails to adopt."
tags: [dom, hydrate, tests, markers, happy-dom]
confirmed: 2026-10-25
---
# Why

Region markers are HTML comments whose nodeValue hydrate matches exactly: `<!--[-->` parses to data `[`, `<!--]-->` to `]` (`isMarkOpen`, `packages/dom/lib/internal/hydrate.ts`). A marker written one dash short (`<!--[->>`) contains no `-->` terminator, so the HTML parser swallows everything up to the next `-->` into a single comment node: the element content vanishes, no `[`-valued comment exists, and `hydrate`/`claimFlaggedChild` silently skip adoption — no throw, no `console.warn`, DOM untouched. Three test-run cycles were spent diagnosing this as a hydrate bug before the parsed shape was inspected.

# Evidence

Probe against `packages/dom` (2026-10-25): setting `container.innerHTML = '<ul id="list"><!--[->><li>a</li><!--]--></ul>'` left `container.innerHTML` byte-identical after `hydrate(...)` (no adoption, no warning); correcting the open marker to `<!--[-->` made the same hydrate adopt and throw the expected claim error. The gather depth-walk over marker values is `gatherRegion`/`consumeRegion` in `packages/dom/lib/internal/hydrate.ts`. When a hand-set server-HTML hydrate test no-ops, print `container.innerHTML` (or `childNodes`) before blaming the walker.
