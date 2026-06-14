## [ ] Server Side Rendering Foundation

### Depends On
None

### Objective
Implement server-side rendering (renderToString) and hydration for HellaJS so it can render on the server and activate interactively on the client. Currently HellaJS has no SSR support — all competitors do.

### Tasks

#### [ ] Implement renderToString

Create a `renderToString()` function at `packages/dom/lib/ssr.ts` that walks a HellaNode tree and produces HTML as a string without touching any DOM APIs. This must:
- Resolve signal values to their current state
- Skip event handlers (`on:`, `e:`), lifecycle hooks (`hook:`), and error config (`error:`) — these are client-only
- Render `bind:` attributes using their current value
- Handle fragments (`tag: "$"`) by concatenating children
- Handle dynamic components by resolving them
- Handle ForEach, Portal, Lazy, and Transition components by producing appropriate markup (or placeholder content)
- Escape attribute values and text content for safe HTML output
- Support `@hellajs/resource` data fetching — wait for async resources to resolve before returning

#### [ ] Implement hydration

Create a `hydrate()` function that takes server-rendered HTML (already in the DOM) and attaches reactive bindings, event handlers, and effects without recreating elements. Must:
- Walk the existing DOM tree and match it to the HellaNode tree
- Register `bind:` effects on existing elements
- Attach `on:` and `e:` event handlers
- Execute lifecycle hooks
- Match children by position (or by key for ForEach) for correct hydration
- Handle Portal, Lazy, Transition — these need their client-only setup without server markup
- Use ElementState WeakMap (already exists) for attaching state to existing DOM nodes

#### [ ] Implement streaming SSR

Extend `renderToString` to support streaming — yield HTML chunks as components resolve. Must:
- Support `Lazy` components — emit placeholder HTML immediately and resolve client-side
- Support async resource fetching — stream initial HTML, resolve resources progressively
- Return a `ReadableStream` or async generator

#### Solution

##### Tests

- Create `packages/dom/tests/ssr.test.ts` with:
  - renderToString produces correct HTML for static content
  - renderToString resolves signal values to their current state
  - renderToString skips event handlers and lifecycle hooks
  - renderToString renders bind: attributes as static values
  - renderToString handles fragments, dynamic components, ForEach, Portal, Lazy
  - hydrate attaches bindings/events to existing DOM without recreating elements
  - hydrate handles keyed ForEach reconciliation correctly
  - hydrate handles Portal and Lazy components
  - Streaming SSR produces correct chunks

##### Documentation

- Document `renderToString()` and `hydrate()` in the dom package README
- Update `comparison.md` section 14 (SSR red flag) and 13 (DevX table — SSR/Hydration planned → supported)
- Add SSR usage example to docs

##### Validation

- `bun check dom` passes
- renderToString output for a simple app matches expected HTML string
- hydrate test renders server HTML, runs hydrate, then verifies reactive updates work
- Streaming SSR test verifies chunk order and content

### Tests
Test files: `packages/dom/tests/ssr.test.ts`

Test scenarios:
- Static content rendering
- Reactive signal-based content
- Nested components
- ForEach with various key strategies
- Portal and Lazy in SSR context
- Full hydration lifecycle: server render → inject HTML → hydrate → verify interactivity

### Documentation
- `packages/dom/README.md` — add SSR/Hydration API docs
- `packages/dom/comparison.md` — update sections 13 and 14
- Update the dom package AGENTS.md mental model

### Validation
- All SSR tests pass
- Bundle size for the SSR module is reasonable (no DOM dependency)
- Hydration produces identical DOM structure to client-only render
