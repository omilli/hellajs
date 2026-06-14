## [ ] Add coordinated async loading (Suspense)

### Depends On
[add-context-api.md](../dom-design-improvements/add-context-api.md) — Suspense needs a context-like registration mechanism. Standalone `Lazy` continues to work unchanged.

### Objective
`Lazy` handles individual async components but there is no way to coordinate multiple async boundaries — show a single loading state while 3 lazy components load, then reveal all at once. React has Suspense, Solid has Suspense, Vue has Suspense, Svelte has await blocks. HellaJS has nothing for coordination.

### Tasks

#### [ ] Phase 1: Suspense primitive in core

#### Solution
Add a `Suspense` component to `@hellajs/dom` that coordinates multiple async child boundaries:

```ts
function Suspense(props: {
  children: HellaNode | HellaNode[];
  fallback?: HellaNode;
  onComplete?: () => void;
}): JSX.Element;
```

Implementation approach:
- Registration: Async boundaries (Lazy, or explicit `useSuspense` hooks) register with the nearest `Suspense` ancestor via a context-like API.
- State tracking: The Suspense component tracks a loading count. When a child starts loading, count increments. When it resolves, count decrements.
- Fallback display: When count > 0, render `fallback` instead of children. When count reaches 0, reveal children.
- Nested Suspense: Inner boundaries manage their own loading state. They only affect parent Suspense when the inner boundary itself is loading (not its children).

Backward compatible: existing `Lazy` without `Suspense` works unchanged. `Suspense` only affects Lazy descendants.

Key design: Suspense shows fallback until ALL direct async descendants are ready. Once revealed, subsequent lazy loads within the boundary happen independently (no re-showing fallback).

##### Tests
- Suspense with one lazy child: shows fallback, then reveals
- Suspense with multiple lazy children: shows fallback until all loaded
- Nested Suspense boundaries: each manages its own loading state
- Suspense without lazy children: renders immediately
- Suspense with mixed static and lazy children
- Lazy outside Suspense: works unchanged
- Suspense error handling: lazy error triggers parent error boundary

##### Documentation
- AGENTS.md: add Suspense architecture docs and usage patterns
- CHANGELOG: minor entry

##### Validation
- `bun check dom` passes
- Suspense coordinates multiple lazy boundaries correctly
- Existing Lazy usage unchanged

#### [ ] Phase 2: Suspense transitions and error integration

#### Solution
Add transition-aware Suspense and tight integration with error boundaries:

- **Transitions**: Skip fallback on fast loads (configurable threshold). `startTransition` API wraps state changes that should not show fallback.
- **Error boundaries**: When a lazy child inside Suspense fails, Suspense shows its fallback with error reason if no closer error boundary exists.
- **SuspenseList**: Coordinate multiple Suspense boundaries collectively (reveal in order, reveal all at once).

##### Tests
- Suspense with fast children: no fallback flash
- Suspense with startTransition: stale content during transition
- SuspenseList with revealOrder
- Suspense error integration

##### Documentation
- AGENTS.md: update Suspense docs with transitions and SuspenseList
- CHANGELOG: minor entry

##### Validation
- Transitions prevent UI flash on fast loads
- SuspenseList correctly orders content reveals

### Documentation
Full Suspense API docs: getting started, coordination patterns, error handling, transitions.

### Validation
Multiple lazy components coordinate under a single loading boundary. Transitions prevent flicker. No breaking changes to existing Lazy usage.
