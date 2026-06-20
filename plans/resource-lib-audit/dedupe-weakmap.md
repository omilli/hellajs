## [ ] WeakMap-keyed deduplication map
**Type:** Code

### Depends On
- Extract internal helpers

### Objective
The ongoing-request deduplication map auto-collects when fetcher functions are garbage-collected, eliminating a slow leak in long-lived apps that create many distinct fetchers.

### Solution
In `internal/dedupe.ts` (created by the extract task), change `ongoingRequestsMap` from `Map<unknown, Map<unknown, …>>` to `WeakMap<Function, Map<unknown, …>>`. The inner map remains a strong `Map` because inner keys can be primitives (URLs, computed keys) and must survive across `run()` invocations.

The outer key is always a function in practice — the URL-string overload at the top of `resource()` immediately wraps the URL into an async fetcher, so by the time `run()` reads `ongoingRequestsMap.get(fetcher)`, the key is a function. Update the type at the `resource()` callsite to reflect this.

This aligns with `./guides/code.md` § Memory: *"WeakMap/WeakSet for element-associated data — auto-GC when elements are removed."*

Trade-offs: narrows the outer-key type from `unknown` to `Function`. No callsite passes a non-function outer key, so the narrowing is sound. `WeakMap` has no `.clear()` — on full reset, reassign a new instance to a `let` binding (per the guide's documented WeakMap exception). The current code never calls `.clear()` on `ongoingRequestsMap`, so this is a non-issue today but document it in the module-level comment.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc (`@internal` since `dedupe.ts` is not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — no public API change, no observable behavior change for any caller that passes a function fetcher (which is all callers)
- [ ] Audit skill on changed lines reports no deviations from `./guides/code.md`
- [ ] Does `rg "WeakMap" packages/resource/lib/internal/dedupe.ts` confirm the outer container is a `WeakMap`?
- [ ] Does the inner-map type remain a strong `Map` (not `WeakMap`)?
