## [ ] Add SSR rendering and hydration support

### Depends On
None

### Objective
`@hellajs/dom` is entirely browser-bound — it assumes `document`, `MutationObserver`, `window`, and `queueMicrotask` everywhere. This makes it impossible to render HellaNode trees on the server or hydrate server-rendered HTML on the client. Adding SSR + hydration unlocks SEO, initial load performance, and progressive enhancement.

### Tasks

#### [ ] Phase 1: Proof of concept — string rendering

#### Solution
Build a `renderToString(node: HellaNode)` function that walks the HellaNode AST and produces an HTML string. This requires:

- Map HellaNode tags to HTML tags (including `"$"` fragment → empty string)
- Serialize `props` as HTML attributes (handle boolean attrs, array attrs, style objects)
- Serialize `children` recursively
- **Skip all reactive bindings** (`bind:`, `on:`, `hook:`, `error:`) — SSR produces static HTML
- **Skip dynamic components** that require DOM (ForEach, Portal, Lazy, Transition) or render them in a best-effort mode
- Handle void elements (img, br, input, etc.) correctly

Implementation location: new package `@hellajs/ssr` or a sub-path export `@hellajs/dom/ssr`. A separate package is cleaner since SSR may depend on different things and users pay zero cost in browser bundles.

Key decisions:
- No hydration data embedded in HTML initially (Phase 2)
- No streaming (Phase 3+)
- Static HTML output only

##### Tests
- Add test: renderToString with simple element → verify HTML string
- Add test: renderToString with nested elements → verify nesting
- Add test: renderToString with attributes (string, boolean, array, style) → verify HTML output
- Add test: renderToString with fragments → verify no wrapper
- Add test: renderToString with void elements → verify self-closing
- Add test: error handling — invalid HellaNode → throws or returns fallback

##### Documentation
- New AGENTS.md for @hellajs/ssr package
- Architecture decision record: why separate package vs dom sub-path

##### Validation
- `renderToString` produces valid, parseable HTML
- No DOM APIs called during string rendering
- All existing browser tests unchanged

#### [ ] Phase 2: Client hydration

#### Solution
Build `hydrate(node: HellaNode, target: Element)` that attaches reactive bindings to pre-existing DOM (output from `renderToString`).

Hydration differs from `mount()`:
- Does NOT call `replaceChildren` — the DOM already exists
- Walks the existing DOM tree in parallel with the HellaNode tree
- Attaches event handlers, reactive bindings (effects), and lifecycle hooks to existing DOM nodes
- Does NOT recreate static elements
- Tracks mismatches between SSR output and client expectations (warn, don't crash)

Key challenge: the HellaNode tree needs to produce deterministically-ordered DOM nodes that match the SSR output. Since SSR currently skips dynamic components (ForEach/Lazy/Portal), hydration skips them too.

Implementation: a parallel walker that visits existing DOM nodes and HellaNode tree simultaneously, matching by position. For each HellaNode, find the corresponding DOM node by index and call `mountNode`-like logic on it without creating new elements.

##### Tests
- Add test: renderToString → hydrate → verify reactive bindings work on existing DOM
- Add test: hydrate with event handlers → verify handlers fire
- Add test: hydrate with reactive text → verify updates on signal change
- Add test: hydrate with attribute bindings → verify updates on signal change
- Add test: hydrate mismatch detection → verify warning
- Add test: hydrate on static-only SSR output → verify no crash

##### Documentation
- Add hydration API docs
- Document SSR/hydration limitations (no dynamic components, no portal content)

##### Validation
- Hydrated DOM has working reactivity
- No double-rendering or flash
- SSR HTML is parseable and matches hydrated tree

#### [ ] Phase 3: Streaming SSR and progressive enhancement

#### Solution
Build streaming SSR (`renderToStream`) and progressive enhancement patterns. This phase is deferred until Phase 1+2 are stable.

Key features:
- `renderToStream(node, writable)` — produces HTML in chunks using async generators
- Out-of-order streaming for lazy/async components
- Selective hydration — hydrate only interactive parts
- Form interactions without JS (progressive enhancement patterns via `@hellajs/router`)

##### Tests
- Streaming integration tests (multiple chunks, async boundaries)
- Progressive enhancement — page works with JS disabled

##### Documentation
- Full SSR guide with examples
- Architecture overview of streaming pipeline

##### Validation
- Streaming SSR produces valid HTML
- Progressive enhancement works
- Performance benchmarks against alternatives

### Documentation
Full documentation for the SSR package: getting started, API reference, limitations, migration guide.

### Validation
SSR + hydration produces interactive pages from server-rendered HTML. No breaking changes to existing browser-only usage.
