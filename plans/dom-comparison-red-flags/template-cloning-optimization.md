## [x] Template Cloning Optimization

### Depends On
None

### Objective
Optimize the `html` template system to avoid deep-cloning the entire AST on every invocation. Static subtrees (no placeholders) should be shared across all invocations instead of recreated.

### Tasks

#### [x] Mark static subtrees during parsing

During template parsing in `html.ts`, identify subtrees that contain no placeholders and mark them as static:
- After parsing, walk the AST and annotate nodes/subtrees with zero placeholder dependencies as `__static`
- Static subtrees are immutable and shared across all template invocations
- A node is static only if all its attributes and children are static

#### [x] Implement lazy cloning with structural sharing

Modify `cloneWithValues()` to skip static subtrees entirely:
- If a node is marked `__static`, return the cached reference directly (no clone)
- Only deep-clone subtrees that contain placeholders
- Placeholder nodes (`__placeholder`, `__dynamicComponent`) are still resolved per invocation
- The shallow-cloning optimization (already in place) continues for the dynamic parts

#### Solution

##### Tests

- [x] Template with no placeholders: verify the cached AST is returned directly without cloning
- [x] Template with static + dynamic parts: verify static subtrees are shared references
- [x] Deeply nested template with mixed static/dynamic content
- [x] Dynamic parts still produce unique values per invocation

##### Documentation

- [x] Update `packages/dom/comparison.md` section 14 (template cloning red flag → resolved)

##### Validation

- [x] All existing html and DOM tests pass (792 tests, 0 fails)
- [x] Object allocation per template invocation is reduced (static subtrees shared, no cloning)
- [x] Behavior is identical for all template types (static, mixed, dynamic-only)
- [x] `bun check dom` passes

### Tests
Test file: `packages/dom/tests/html.test.ts` (extended)

Test scenarios:
- [x] Static subtree sharing: `Object.is(ast1.children[0], ast2.children[0])` for static parts
- [x] Dynamic parts still produce unique values per invocation
- [x] Deeply nested templates with mixed static/dynamic content
- [x] Regression: no behavior change for all existing template patterns

### Documentation
- [x] `packages/dom/comparison.md` — update section 14 red flag status
- [x] Internal code comments on the `__static` marking and lazy cloning logic

### Validation
- [x] All tests pass
- [x] 792 tests, 0 failures — all existing tests unchanged
- [x] `bun check dom` passes
