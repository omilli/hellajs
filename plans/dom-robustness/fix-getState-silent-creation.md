## [ ] Add development-time warning for silent getState() state creation

### Depends On
None

### Objective
At `lib/internal/state.ts:17-20`, `getState(node)` silently creates an empty `ElementState` if one doesn't exist. This can mask bugs where `hasState()` should have been checked first. While efficient in hot paths where the node is known to have state, it makes accidental state leakage harder to detect.

### Tasks

#### [ ] Add assertion or dev warning in getState()

#### Solution
Two approaches, apply both:

1. Add a development-time check in `getState()` that warns when it creates state on a node that shouldn't have it. Use `__DEV__` or environment flag gating (check if `process.env.NODE_ENV === 'development'` or use a flag).

2. Add a `createState(node)` export that explicitly creates state, and migrate call sites that intentionally create state to use it. Keep `getState()` for read/write-only-after-creation.

The development warning approach is safer and non-breaking. Wrap the silent creation in a dev-only guard:

```ts
export function getState(node: Node): ElementState {
  if (!stateMap.has(node)) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[dom] getState() created state on a node without existing state. Use hasState() to check first, or switch to peekState() for read-only access.');
    }
    stateMap.set(node, createEmptyState());
  }
  return stateMap.get(node)!;
}
```

##### Tests
- No behavioral change in production — existing tests pass unchanged
- Add test verifying that dev warning does not fire in normal code paths
- Add test verifying that getState() on a node with state works as expected

##### Documentation
- AGENTS.md: note the dev warning in the state.ts data structure docs


##### Validation
- `bun check dom` passes
- No new warnings in existing test suite
- Manual verification in dev mode: calling getState on a fresh node produces a warning

### Tests
Minimal — the fix is a dev-only diagnostic. Verify existing tests pass and no warnings appear.

### Documentation
AGENTS.md: state.ts section should note the dev-only diagnostic.

### Validation
Dev warning appears when expected. Production behavior is identical.
