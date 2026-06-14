## [ ] Add component-level lifecycle hooks

### Depends On
None

### Objective
`lib/component.ts` only wraps the render function in a `scope()` for automatic effect cleanup. There is no built-in way for plain function components to run mount/cleanup logic. Users must either use `hook:` on individual elements or reach into `@hellajs/core`'s `effect` directly. Adding `onMount`, `onCleanup`, and `onError` hooks at the component level aligns with every other reactive framework.

### Tasks

#### [ ] Design and implement component-level lifecycle hooks

#### Solution
Add a lightweight API that `component()` (or a new wrapper) provides to function components. The hooks fire when the component mounts (after all child nodes are inserted) and when it unmounts (during scope disposal).

Design:

```ts
import { component } from '@hellajs/dom';
// or from @hellajs/core

// Option A: Hooks as a second argument to component()
export function component(
  fn: ComponentFn,
  props: unknown,
  hooks?: {
    onMount?: () => void;
    onCleanup?: () => void;
    onError?: (err: Error) => void;
  }
): HellaNode;
```

Implementation:
- `onMount`: registered as a `hook:afterMount` on the root element of the component. If the component is a fragment (tag: `"$"`), apply to the first child or use a marker.
- `onCleanup`: stored in the component scope and called when `__scope` is disposed.
- `onError`: stored in the error config of the root element's state.

Alternatively, export standalone `onMount`, `onCleanup`, `onError` functions that users call inside their component function (like Solid):

```ts
import { onMount, onCleanup } from '@hellajs/dom';

const Counter = () => {
  const count = signal(0);
  onMount(() => console.log('mounted'));
  onCleanup(() => console.log('cleaned'));
  return html`<button on:click=${() => count(count() + 1)}>${count}</button>`;
};
```

The standalone approach is more ergonomic and matches framework conventions. Implementation: the functions read the current scope from a global variable (set by `scope()` and `component()`), and register cleanup/mount callbacks on it.

Since `component()` and `scope()` both exist in core, the lifecycle registration can be in core with re-exports from dom.

##### Tests
- Add test: `onMount()` in component → verify fires after mount
- Add test: `onCleanup()` in component → verify fires on unmount
- Add test: `onError()` in component → verify catches render/effect errors
- Add test: multiple `onMount` calls in same component → verify all fire
- Add test: `onMount` with async component → verify fires after async resolution
- Add test: lifecycle in nested components → verify correct ordering (inner first, outer cleanup)

##### Documentation
- AGENTS.md: add component lifecycle hooks to core and dom docs
- AGENTS.md: add usage pattern for onMount/onCleanup/onError

##### Validation
- `bun check dom` and `bun check core` pass
- Lifecycle hooks fire at correct times in component lifecycle
- No memory leaks when components unmount without calling onCleanup

### Tests
Add `tests/component-lifecycle.test.ts` to dom package.

### Documentation
AGENTS.md: add component lifecycle usage patterns and architecture notes.

### Validation
Component lifecycle hooks fire at expected times and clean up properly.
