## [ ] Add optional Shadow DOM support to element()

### Depends On
None

### Objective
At `lib/element.ts:16`, `element()` uses light DOM only. The AGENTS.md states "no shadow DOM (breaks reactivity internals)" — but this limits custom element usage for style encapsulation and library component distribution. Adding an optional Shadow DOM mode would make `element()` a viable authoring tool for production-ready web components.

### Tasks

#### [ ] Design and implement optional Shadow DOM mode for element()

#### Solution
Add a third parameter (or options object) to `element()`:

```ts
export function element<T>(
  tagName: string,
  render: ComponentRenderFn<T>,
  options?: { shadow?: boolean | ShadowRootInit }
): void;
```

When `shadow: true` or a `ShadowRootInit` is provided:

1. In `_mount()`, instead of calling `mount(render(props), this)` (which mounts to the light DOM), call `mount(render(props), this.attachShadow({ mode: 'open', ...options }))`.
2. Slot capture should read from `this.childNodes` (light DOM children) and project them into the shadow root — this mirrors native `<slot>` behavior.
3. The `props.children` and `props.slots` data still come from the light DOM children (captured before mount, observed via MutationObserver if the dynamic-slots task is implemented).
4. The version signal bump still works through the proxy's `setAttribute`/`removeAttribute` overrides.

Reactivity internals concern: the AGENTS.md says "shadow boundaries break its reactivity internals." The specific concern is that the `error:boundary` walking (`dispatch.ts`) uses `parentElement` which doesn't cross shadow boundaries, and event delegation (`events.ts`) uses `composedPath()` which DOES cross shadow boundaries. Need to verify and potentially fix:

- `findBoundary()` at `dispatch.ts:58-82`: walks `parentElement` — this stops at the shadow root. The boundary system uses element parent hierarchy which is DOM-scoped. If the shadow root's host element has a boundary, it would need a `composedPath()`-style traversal. For the shadow mode, the render output is inside the shadow root, but error boundaries are part of the render tree inside the shadow root. The issue is whether the boundary can reach outside the shadow root — which is an edge case. Document that shadow mode boundaries are scoped to the shadow tree.
- Event delegation: `composedPath()` correctly crosses shadow boundaries, so delegated events on elements inside the shadow root work. The handler is registered on the shadow-root-internal element.

For the initial implementation, keep it simple:
- `shadow: true` creates an open shadow root and mounts content into it
- Slot capture reads light DOM children once (or dynamically with the reactive-slots task)
- Document that error boundaries and event delegation are scoped to the shadow tree
- Attach `ShadowRoot` to the component's state for external access

##### Tests
- Add test: element with `shadow: true` — verify shadow root created
- Add test: element with shadow — verify content renders inside shadow root
- Add test: element with shadow and slots — verify light DOM children projected
- Add test: element with shadow — verify style encapsulation
- Add test: element without shadow — verify existing behavior preserved (no shadow root)
- Add test: element with `shadow: { mode: 'closed' }` — verify closed shadow root works

##### Documentation
- AGENTS.md: add shadow mode option to element() docs
- AGENTS.md: document limitations (error boundary scoping, slot capture timing)

##### Validation
- `bun check dom` passes
- Shadow mode creates proper shadow roots
- Light DOM mode unchanged
- Event delegation works both in and out of shadow roots

### Tests
Extend `tests/element.test.ts` with shadow mode test cases.

### Documentation
AGENTS.md: update element() architecture to describe shadow mode and its limitations.

### Validation
Optional shadow mode works correctly for style encapsulation. Light DOM mode is unchanged.
