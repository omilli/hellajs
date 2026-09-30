---
type: decision
title: Narrow Map-iterator destructuring in packages/*/lib with == null guards — doc-snippets strict tier typechecks lib sources and rejects the possibly-undefined elements
description: In lib code a Map-iterator destructure types elements possibly-undefined; `bun doc-snippets` can be the first gate to fail, so narrow with `== null` guards.
tags: [arch, contract]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [doc-snippets, iterator-destructure, noUncheckedIndexedAccess, map-values, ts18048]
---
# Why

`MapIterator` destructuring cannot see the size invariant, so TS types every destructured element `T | undefined`; `noUncheckedIndexedAccess: true` also keeps `Array.from(...)[i]` undefined-able, and a non-null assertion or `as` tuple cast fights the config. The sanctioned shape is the guide's stays-raw loose-null guard: it narrows the type AND doubles as real flow control (single-pointer early return in a two-pointer gesture). `bun coverage <pkg>` may not reach its tsc stage before another stage fails, so a lib typing error can first appear at the doc-snippets gate where it looks like a docs problem, not a source problem.

# Evidence

`packages/dom/lib/onPinch.ts` used `const [first, second] = pointers.values()` in two places; `bun doc-snippets` strict tier failed with 16 TS18048 diagnostics ("'first'/'second' is possibly 'undefined'") at the implementation lines (scripts/doc-snippets.ts maps `@hellajs/dom/*` to `packages/dom/lib/*`, so onpinch.mdx's barrel import pulls the lib file into the checked program). Replacing the `pointers.size < 2` checks with `if (first == null || second == null) return;` made `bun doc-snippets` exit 0 (0 strict findings) with all 9 onPinch tests still passing (`bun coverage dom` exit 0, 557/0).
