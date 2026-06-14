## [ ] Add DevTools integration

### Depends On
None

### Objective
HellaJS has no developer tooling — no way to inspect the reactive graph, DOM bindings, signal values, or component hierarchy at runtime. Every competing framework has DevTools (React DevTools, Vue DevTools, Svelte DevTools, Angular DevTools, Solid DevTools). This makes debugging HellaJS applications harder than it needs to be.

### Tasks

#### [ ] Phase 1: Instrumentation layer in core and dom

#### Solution
Add an optional instrumentation layer to `@hellajs/core` and `@hellajs/dom` that records reactive operations for DevTools consumption. The instrumentation must be:

- **Opt-in**: not loaded unless the user imports (or DevTools triggers it)
- **Zero-cost when disabled**: no condition checks in hot paths
- **Structured**: emits typed events that a DevTools panel can consume

Core instrumentation:
- Signal creation and disposal
- Effect creation, disposal, and re-execution
- Dependency tracking (signal → effect edges)
- Computed value updates

DOM instrumentation:
- Element creation (HellaNode → DOM Node)
- Reactive binding setup (signal → DOM property)
- Event handler registration
- Component mount/unmount
- ForEach reconciliation (keys, moves, inserts)
- Portal rendering
- Lazy loading lifecycle
- Error boundary activations

Implementation approach:
- Add a `devtools` export from `@hellajs/dom` that monkey-patches or wraps internal functions
- Use a global `__HELLA_DEVTOOLS__` hook that the DevTools extension sets
- When the hook is present, instrumentation emits events to it

Key: the instrumentation must not affect production behavior. Use the same pattern as React DevTools — a global `__HELLA_DEVTOOLS_HOOK__` that's checked once and if absent, no instrumentation runs.

##### Tests
- Add test: instrumentation layer loads without errors
- Add test: instrumented operations emit correct events
- Add test: instrumentation can be disabled and re-enabled
- Add test: zero-cost when __HELLA_DEVTOOLS_HOOK__ is absent (no performance regression)

##### Documentation
- AGENTS.md: add devtools instrumentation architecture docs
- CHANGELOG: minor entry

##### Validation
- Instrumentation emits all expected events
- No performance regression in non-instrumented mode

#### [ ] Phase 2: Browser extension

#### Solution
Build a browser extension (Chrome + Firefox) that connects to the instrumentation layer and provides a DevTools panel with:

- **Components tab**: component tree with selected component details (props, state, signals)
- **Signals tab**: all active signals, their current values, subscribers, and dependency graph
- **Performance tab**: effect execution timing, re-render counts, reconciliation stats
- **DOM inspector**: hover-to-highlight mapping between HellaNodes and DOM nodes

The extension is a separate repository (`hellajs/devtools`) that depends on the instrumentation API defined in Phase 1.

Technology choices:
- WebExtension Manifest V3
- Preact or vanilla JS for the panel UI
- D3 or vis.js for dependency graph visualization
- TypeScript throughout

##### Tests
- E2E tests using Puppeteer or Playwright — load a HellaJS app with devtools open, verify panel shows correct data
- Unit tests for panel data processing

##### Documentation
- DevTools README: installation, features, usage guide
- Screenshots and walkthrough

##### Validation
- Extension works in Chrome and Firefox
- Panel shows real-time component/signal data
- No significant performance overhead with extension open

#### [ ] Phase 3: Advanced features

#### Solution
- **Time-travel debugging**: record signal value changes and allow stepping through state history
- **Profiler**: record effect execution times and identify performance bottlenecks
- **Logger**: structured console logging for signal/effect lifecycle events
- **Import/export**: save and share debug snapshots

##### Tests
- Integration tests for time-travel recording and replay
- Profiler accuracy benchmarks

##### Documentation
- Advanced debugging guide
- Video walkthrough

##### Validation
- Time-travel debugging correctly replays state changes
- Profiler identifies slow effects
- Logger produces actionable output

### Documentation
DevTools README, AGENTS.md extensions, and a dedicated debugging guide.

### Validation
Developers can inspect, profile, and debug HellaJS applications using browser DevTools.
