# @hellajs/core Documentation Audit

## Accuracy

- [ ] **effect.mdx API signature doesn't match source TypeScript signature**
  The source code (`lib/effect.ts:13`) declares `effect(effectFn: () => void): () => void`, but the docs show `effect(effectFn: () => void | (() => void)): () => void`. The doc version is more descriptive of actual behavior (the function *can* return a cleanup), but it doesn't match the published TypeScript types. Consumers relying on the doc signature may expect TypeScript to accept `() => (() => void)` as distinct from `() => void`.
  **Recommendation**: Align the docs with the source signature `effect(effectFn: () => void): () => void`, and explain the cleanup return value in the parameter description instead (e.g., "`effectFn`: The function to execute. May return a cleanup function that runs before re-execution and on disposal.")

- [ ] **reactivity.mdx error handling example doesn't clearly demonstrate flush abort**
  The "Error Handling" section shows two effects with separate dependencies (`threshold` and `value`). When `threshold(10)` throws, the comment says "first effect aborts the flush, second effect never runs" — but the second effect only reads `value`, not `threshold`, so it wouldn't be scheduled by this change regardless. The abort behavior is vacuously true, not clearly demonstrated.
  **Recommendation**: Add a third effect that depends on `threshold` (or have both effects depend on the same signal) to clearly show that a later-scheduled effect is skipped when an earlier one throws. Reference the test `test("effect error during flush stops queue processing")` which demonstrates this correctly with three effects all reading signal `a`.

- [ ] **patterns/reactivity.mdx "Error Propagation" section has the same misleading example**
  Same issue as the concepts doc — the example doesn't clearly show flush abort because the second effect doesn't depend on the throwing effect's signal.
  **Recommendation**: Same as above — restructure so both effects depend on the same signal to clearly demonstrate the flush queue abort.

## Completeness

- [ ] **computed.mdx doesn't mention lazy evaluation**
  Computed values are lazy — they only recalculate when read, not when dependencies change. This is a key behavioral distinction from effects (which are eagerly scheduled). The Internal Mechanics section in `concepts/reactivity.mdx` mentions this briefly, but the API reference doc doesn't.
  **Recommendation**: Add a `### Lazy Evaluation` sub-section under `## Key Concepts` explaining that computed values recalculate on-demand when read, not when dependencies change. Include a brief example showing that merely changing a dependency doesn't trigger recomputation until the computed is accessed.

- [ ] **computed.mdx doesn't document error behavior**
  The source and tests show that when a computed throws before reading a dependency, tracking is incomplete. On re-execution (after the throwing condition changes), tracking is rebuilt. The test `test("errors in computed recover dependency tracking on re-execution")` covers this. Neither the API doc nor the concepts doc mention computed error behavior.
  **Recommendation**: Add an `### Error Recovery` sub-section under `## Important Considerations` in computed.mdx explaining that errors during computation prevent dependency tracking, but tracking rebuilds correctly on next successful execution.

- [ ] **effect.mdx doesn't document the cleanup return value pattern with an example**
  The API section mentions the cleanup return value, and the patterns doc has a brief example, but the effect API doc's `## Basic Usage` section doesn't demonstrate returning a cleanup function from an effect. This is an important pattern (clearing intervals, removing event listeners) that deserves a dedicated example in the primary effect docs.
  **Recommendation**: Add a `### Cleanup Return Value` sub-section under `## Key Concepts` with a self-contained example showing an effect that returns a cleanup function (e.g., `setInterval` → `clearInterval`).

- [ ] **effect.mdx Infinite Loops section mentions `batch` as a solution but doesn't show it**
  The text says "Use `untracked` for non-reactive reads or `batch` to group the read and write into a single update cycle" but only demonstrates `untracked`. The `batch` solution is not shown.
  **Recommendation**: Either add a `batch` example showing how it helps with read-write cycles, or remove the mention of `batch` as a solution for infinite loops since `untracked` is the primary solution.

## Clarity

- [ ] **untracked.mdx violates style guide section order**
  The sections appear as: `## API` → `## Important Considerations` → `## Basic Usage`. The style guide specifies: `## API` → `## Basic Usage` → `## Key Concepts` → `## Important Considerations`. Readers encounter edge cases before understanding basic usage.
  **Recommendation**: Move `## Basic Usage` before `## Important Considerations` to match the style guide template.

- [ ] **state.mdx uses JSX/DOM syntax in a core package concept doc**
  The `state.mdx` concept doc uses `jsx` language tag and `on:click` DOM syntax, which requires knowledge of `@hellajs/dom`. Readers exploring core concepts may not be familiar with DOM package syntax.
  **Recommendation**: Either use `typescript` language tag with plain signal usage (matching the core package convention), or add a note that the example uses DOM package syntax for illustration and link to the DOM docs.

- [ ] **computed.mdx has inconsistent blank line in section header**
  Line 34 has an extra blank line between `## Key Concepts` and `### Previous Value`, which is inconsistent with the rest of the documentation where `###` sub-headings follow `##` immediately.
  **Recommendation**: Remove the extra blank line for consistency.

- [ ] **README.md description says "topological execution" but concepts/reactivity.mdx says "depth-first traversal"**
  The README says "topological execution" while the internal architecture uses depth-first traversal with manual stacks. These are related but not identical concepts. The concepts doc correctly says "depth-first traversal."
  **Recommendation**: Align terminology — either use "depth-first traversal" consistently, or clarify that topological order is achieved via depth-first propagation.
