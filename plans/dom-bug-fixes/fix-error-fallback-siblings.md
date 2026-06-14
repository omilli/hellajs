## [x] Fix error boundary fallback wiping sibling nodes

### Depends On
None

### Objective
At `lib/internal/render.ts:216-217`, when a reactive child throws and a `currentBoundary` is present, the code calls `currentBoundary.replaceChildren(mountNode(fallback))`. This replaces ALL children of the boundary, not just the errored child. Any sibling elements (e.g., other list items in a ForEach, static elements) are destroyed.

### Tasks

#### [x] Scope fallback rendering to the errored child only

#### Solution
The current code replaces the entire boundary's children with the fallback. Instead, the fallback should be inserted at the anchor point that tracks the reactive child's position.

The reactive child rendering in `appendToParent` (`render.ts:150-227`) uses an `anchor` text node and `renderedNodes[]` array to track the dynamic content. When an error occurs and a boundary is available, the fallback should replace just the `renderedNodes` at the anchor position, not all boundary children.

Approach: when `currentBoundary` is set and a reactive child errors:
1. Remove the current `renderedNodes` (already done at `render.ts:206-213`)
2. Mount the fallback node
3. Insert it before the anchor (replaceChildren is too aggressive)

Remove the `currentBoundary.replaceChildren(mountNode(fallback))` path and always insert before the anchor. The `currentBoundary` check (line 216) existed to ensure the boundary's fallback logic was triggered — but scoping to `actualParent` (the anchor's parent) and inserting before the anchor is more precise.

Verified: `render.ts:216-218` now unconditionally inserts the fallback at the anchor position via `actualParent.insertBefore(fbNode, anchor)`, removing the `currentBoundary.replaceChildren` branch. The `currentBoundary` is still used for `getBoundaryConfig()` lookup at line 203 to resolve the error config — only the fallback insertion path changed.

##### Tests
- [x] boundary with two independent reactive children — make one error, verify sibling unaffected
- [x] boundary with static text followed by reactive child error — verify static text preserved
- [x] nested boundaries — error in inner boundary should not wipe outer boundary content
- [x] existing fallback behavior still works (error triggers fallback rendering)

All four test cases added to `tests/error-boundary.test.ts` and `tests/error-reset.test.ts`. Fixed incorrect assertions: the containing element (e.g., `<span id="sib1">`) correctly persists with the fallback rendered inside it at the anchor position. Added content verification assertions to confirm the fallback text is present within the containing element. Also removed a duplicate "bind errors still replace boundary content" test that was identical to the existing "bind error replaces boundary content when boundary exists" test.

##### Documentation
- [x] AGENTS.md: update error boundary behavior description
- [x] CHANGELOG: patch entry (bug fix)

Updated `<fallback-rendering>` in both `AGENTS.md` and `CLAUDE.md`: "reactive child errors: insertBefore fallback at anchor position (preserves siblings); bind/event errors: replaceChildren on boundary or error element". Changeset created at `.changeset/fix-error-fallback-siblings.md`.

##### Validation
- [x] `bun check dom` passes
- [x] Manual DOM inspection confirms sibling preservation in error scenarios

`bun check dom`: 236 pass, 0 fail. `bun coverage`: 831 pass, 0 fail (up from 828 pass / 4 fail). Coverage maintained at 99.76% funcs, 99.26% lines.

### Tests
Extend `tests/error-boundary.test.ts` with sibling-preservation test cases. Also verify in `tests/error-catching.test.ts`.

Verified: `tests/error-boundary.test.ts` extended with 3 new tests (sibling elements, static text, nested boundaries). `tests/error-reset.test.ts` updated: split combined "event and update" test into separate tests, added reactive child sibling preservation test. Existing `tests/error-catching.test.ts` "effect error in registry.addEffect is caught" test already covers the no-boundary reactive child error path.

### Documentation
AGENTS.md error-boundary-system section: update the "fallback-rendering" algorithm to note per-child scoping.

Verified: `<fallback-rendering>` element updated in both `AGENTS.md` and `CLAUDE.md` at the error-boundary-system algorithm section.

### Validation
Test confirms siblings survive an error in one child within a shared boundary.

Verified: All sibling-preservation tests pass. The containing element persists with fallback content rendered at the anchor position; siblings at the boundary level are unaffected.
