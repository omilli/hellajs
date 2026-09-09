---
type: decision
title: Identity-changing wrap hooks need pre-wrapped reconcile diffs and const-captured pre-wrap containers
description: "Identity-changing wrap hooks need both reconcile passes keying on pre-wrapped forms, and container wrappers must capture the pre-wrap reference (const), never the reassigned binding."
tags: [arch, core, store, collections]
timestamp: 2026-09-22
last_confirmed: 2026-09-22
triggers: [collection-wrap-hook, signalSet-reconcile, container-middleware-wrapper, closure-reassignment-recursion, wrap-identity]
---
# Why

Two failure modes shipped together in the store deep-collections unit (02), both rooted in `wrap` being an identity-changing transform:

1. **Set reconcile must pre-wrap its diff.** `signalSet`'s reconcile originally wrapped values only in the add pass while the delete pass compared against the raw input set: `tags(new Set(["c"]))` deleted every existing wrapped member (nothing in the raw input matched wrapped membership) and returned an empty set. Both passes must key on a pre-wrapped `Set` of the incoming values — add pass and delete pass alike.
2. **Wrappers must capture the pre-wrap container.** Store's container-level middleware wrapper closed over the `let container` binding and reassigned `container = wrapped`; the wrapper's body then called itself through the binding — infinite self-recursion, surfacing as a hard test hang (bun runner dies silently, the bash tool returns nothing). The readonly guard in the same file was correct because it captured `const guarded = container` first; the fix is the same shape (`const raw = container` before the wrapper, wrapper calls `raw`).

What breaks if ignored: any future wrap consumer (a new host package layered on `CollectionOptions.wrap`) reintroduces the empty-set reconcile or the self-recursive wrapper; the second one presents as a silent process hang, not an error.

# Evidence

Verified 2026-09-22 in worktree plans-core-code-signal-collections, unit 02-store-deep-collections:

- Reconcile bug: `packages/core/tests/signalSet.test.ts` "wrap converts initial values, adds, and reconcile entries" failed with `Set {}` received vs `{A,B,C}` expected; after pre-wrapping the diff (`packages/core/lib/signalSet.ts` `reconcile`), the test passes including the replace-semantics phase (`new Set(["c"])` → `{C}` only).
- Wrapper recursion: `packages/store/tests/collections.test.ts` "middleware transforms whole-collection writes" hung the runner (bash tool timeout, exit 124 on the isolated file); source read showed `wrapped` calling `container(...)` with `container === wrapped` post-reassignment. `const raw = container` capture re-greened the file and `bun coverage store` (100.00/100.00).
