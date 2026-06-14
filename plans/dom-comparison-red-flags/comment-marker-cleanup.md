## [ ] Comment Marker Accumulation

### Depends On
None

### Objective
Reduce or eliminate DOM comment markers that accumulate from ForEach, Portal, Lazy, Transition, and reactive children. Comment markers clutter DevTools, affect `childNodes` counts (breaking third-party code), and remain until the parent is removed from the DOM.

### Tasks

#### [ ] Audit all comment markers in the codebase

Identify every source of comment markers and their purpose:
- `ForEach.ts` — "forEach" start/end markers for list boundaries
- `Portal.ts` — "portal" marker for cleanup tracking
- `Lazy.ts` — "lazy-start" / "lazy-end" for boundary management
- `Transition.ts` — "transition-start" / "transition-end" for boundary management
- `mount.ts` — START/END markers for reactive children
- `html.ts` — any comment insertion during parsing

For each, document: what would break if removed, what alternative approach could replace it.

#### [ ] Reduce or replace unnecessary markers

For each marker type, evaluate whether it can be:
- **Removed entirely** — if the marker's role is served by another mechanism (e.g., ElementState tracking, parent reference)
- **Replaced with data attributes** — use `data-hella-*` attributes on adjacent elements instead of comment nodes. Attributes don't clutter childNodes and are invisible in DevTools
- **Collapsed** — combine multiple adjacent markers into one. For example, ForEach currently uses 2 markers; could use 1 with an attribute on the nearest element
- **Preserved but hidden** — if markers are truly needed for correctness, ensure they're minimized and documented

#### [ ] Implement alternative tracking mechanisms

Where markers provide essential boundary/cleanup information:
- Replace with `ElementState` internal tracking where possible (the WeakMap already exists for per-element state)
- For ForEach: track the container element's bounds via state rather than comment markers. The container reference is known from the parent
- For Lazy/Transition: store cleanup state in ElementState and use the known parent element rather than markers

#### Solution

##### Tests

- For each component that had markers removed/replaced:
  - Verify rendering output is identical (DOM structure)
  - Verify cleanup still works correctly via mutation observer and cleanupSubtree
  - Verify childNodes count matches expectations (no extra comment nodes)
  - Verify ForEach reconciliation still works without markers
  - Verify Lazy loading boundaries still work without markers
  - Verify Transition enter/leave animations still work without markers
  - Verify Portal cleanup still works without markers

##### Documentation

- Update `packages/dom/comparison.md` section 14 (comment marker red flag → resolved)
- Update internal documentation for any changed tracking mechanisms

##### Validation

- All existing DOM tests pass
- `childNodes` no longer contains extra comment nodes in standard rendering scenarios
- DevTools inspection shows clean DOM tree
- `bun check dom` passes

### Tests
Test files: `packages/dom/tests/` (ForEach, Portal, Lazy, Transition, mount tests)

Test scenarios:
- ForEach renders without comment markers, reconciliation still works
- Portal renders without marker, cleanup still triggers on target removal
- Lazy loads async component without markers, fallback/cancellation still works
- Transition enter/leave animation gates work without markers
- Reactive children boundaries work without markers
- No regression in any existing test

### Documentation
- `packages/dom/comparison.md` — update section 14
- `packages/dom/AGENTS.md` — update mental model about markers
- Internal code comments on new tracking mechanisms

### Validation
- All existing tests pass with zero changes to test assertions (comment markers were never explicitly tested, so no tests should break)
- If markers were part of test setup (e.g., checking childNodes.length), those tests are updated
- `bun check dom` passes
