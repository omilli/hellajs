## [ ] Structural Sharing
**Type:** Code

### Depends On
- None

### Objective

Opt-in `structuralSharing: boolean` on `ResourceOptions` that, when `true`, deeply compares the new fetch result against the existing cache entry and preserves object/array references for structurally unchanged nested values, preventing unnecessary reactive cascades in components that shallow-compare references.

### Solution

**Files touched:**
- `packages/resource/lib/resource.ts` — in `handleSuccess`, when `structuralSharing` is set, diff the new result against the current `rawData()` before writing
- `packages/resource/lib/types/resource.d.ts` — add `structuralSharing?: boolean` to `ResourceOptions`

**Strategy:**

1. Add a `structuralShare<T>(prev: T, next: T): T` function. It deep-compares plain objects and arrays:
   - If `prev` and `next` are both arrays of the same length, recursively compare each element. If all elements are structurally equal, return `prev` (preserving reference).
   - If both are plain objects with the same keys, recursively compare each value. If all values are structurally equal, return `prev`.
   - For primitives, use `Object.is`.
   - For Map/Set/Date/etc., use strict equality (they are not structurally compared in v1).
   - For other types (functions, class instances), return `next` (the new value).

2. In `handleSuccess` at `lib/resource.ts:123-128`, before writing to `rawData`, if `structuralSharing` is true, call `structuralShare(untracked(rawData), result)` and use the (potentially reference-preserved) result as the value to store.

3. Also apply in the cache write path: `setCacheData` at line 265 receives the structurally-shared result, so the cache stores the same reference-preserved data.

**Key decisions:**
- Opt-in per resource, not global. Users opt in where reference stability matters most.
- Only plain objects and arrays are structurally compared. Class instances, `Map`, `Set`, `Date` use reference equality.
- The algorithm is a best-effort deep equal, not a full structural clone: it compares and returns references to unchanged subtrees, not copies.
- No external dependency — the implementation is a small recursive function that handles the common POJO/array case.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — `structuralSharing` is optional, default `false`
- [ ] With `structuralSharing: true`, two identical fetch responses produce the same object reference for unchanged nested values
- [ ] With `structuralSharing: true`, a changed nested value preserves the outer reference but updates the changed leaf
- [ ] With `structuralSharing: false` (default), every fetch produces fresh references (existing behavior)
- [ ] `structuralSharing` works with `transform` (the transform is applied after structural sharing)
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
