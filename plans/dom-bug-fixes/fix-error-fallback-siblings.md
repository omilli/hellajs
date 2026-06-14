## [ ] Fix error boundary fallback wiping sibling nodes

### Depends On
None

### Objective
At `lib/internal/render.ts:216-217`, when a reactive child throws and a `currentBoundary` is present, the code calls `currentBoundary.replaceChildren(mountNode(fallback))`. This replaces ALL children of the boundary, not just the errored child. Any sibling elements (e.g., other list items in a ForEach, static elements) are destroyed.

### Tasks

#### [ ] Scope fallback rendering to the errored child only

#### Solution
The current code replaces the entire boundary's children with the fallback. Instead, the fallback should be inserted at the anchor point that tracks the reactive child's position.

The reactive child rendering in `appendToParent` (`render.ts:150-227`) uses an `anchor` text node and `renderedNodes[]` array to track the dynamic content. When an error occurs and a boundary is available, the fallback should replace just the `renderedNodes` at the anchor position, not all boundary children.

Approach: when `currentBoundary` is set and a reactive child errors:
1. Remove the current `renderedNodes` (already done at `render.ts:206-213`)
2. Mount the fallback node
3. Insert it before the anchor (replaceChildren is too aggressive)

Remove the `currentBoundary.replaceChildren(mountNode(fallback))` path and always insert before the anchor. The `currentBoundary` check (line 216) existed to ensure the boundary's fallback logic was triggered — but scoping to `actualParent` (the anchor's parent) and inserting before the anchor is more precise.

##### Tests
- Add test: boundary with two independent reactive children — make one error, verify sibling unaffected
- Add test: boundary with static text followed by reactive child error — verify static text preserved
- Add test: nested boundaries — error in inner boundary should not wipe outer boundary content
- Add test: existing fallback behavior still works (error triggers fallback rendering)

##### Documentation
- AGENTS.md: update error boundary behavior description
- CHANGELOG: patch entry (bug fix)

##### Validation
- `bun check dom` passes
- Manual DOM inspection confirms sibling preservation in error scenarios

### Tests
Extend `tests/error-boundary.test.ts` with sibling-preservation test cases. Also verify in `tests/error-catching.test.ts`.

### Documentation
AGENTS.md error-boundary-system section: update the "fallback-rendering" algorithm to note per-child scoping.

### Validation
Test confirms siblings survive an error in one child within a shared boundary.
