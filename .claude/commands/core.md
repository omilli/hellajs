<core-package-context>
  <key-instructions>
  IMMEDIATELY LOAD ALL THESE FOLDERS & FILES INTO CONTEXT:
  <ul>
    <li>@packages/core - Source code</li>
    <li>@docs/src/pages/learn/concepts/reactivity.mdx - Concepts and examples</li>
    <li>@docs/src/pages/reference/core/ - API documentation</li>
  </ul>
  </key-instructions>
  <common-tasks>
    <development>
      <build>bun bundle core - Build the core package</build>
      <test>bun check core - Run tests and build for core package</test>
    </development>
    <debugging>
      <topology>Focus on tests/core/topology.test.ts for complex dependency graph scenarios</topology>
      <performance>Monitor link recycling, stale validation, and propagation efficiency</performance>
      <edge-cases>Check circular dependency handling, effect cleanup, and error state consistency</edge-cases>
    </debugging>
    <implementation-patterns>
      <reactive-context>Always use setCurrentSub() with try/finally for proper context restoration</reactive-context>
      <tracking-lifecycle>Pair startTracking() and endTracking() to manage dependency collection</tracking-lifecycle>
      <error-handling>Maintain state consistency even during exceptions via atomic flag operations</error-handling>
    </implementation-patterns>
  </common-tasks>
  <architectural-principles>
    <performance-first>Optimized for speed and memory efficiency through bit flags, link recycling, and lazy evaluation</performance-first>
    <minimal-api>Few, composable primitives that handle complex scenarios elegantly</minimal-api>
    <deterministic>Predictable execution order via topological sorting and proper state management</deterministic>
    <zero-dependencies>Self-contained implementation with no external runtime dependencies</zero-dependencies>
  </architectural-principles>
  <critical-algorithms>
    <propagate>Walks subscriber linked lists, upgrading F.P to F.D states, scheduling effects with F.G flag</propagate>
    <validateStale>Iterative depth-first validation with explicit stack management for complex nested dependencies</validateStale>
    <executeEffect>Processes effects in dependency order with recursive handling of nested dependencies</executeEffect>
    <deepEqual>Structural comparison for objects/arrays with special handling for Maps/Sets and primitive reference equality</deepEqual>
    <createLink>Intelligent link reuse during tracking to minimize allocations and optimize hot paths</createLink>
  </critical-algorithms>
  <instructions>
  <p>When working on the core package, you have deep knowledge of the reactive system's internals. Always consider:</p>
  <ol>
    <li><strong>Performance Impact</strong> - Changes affect the critical path of all reactive operations</li>
    <li><strong>Memory Management</strong> - Link recycling and dependency cleanup are essential for long-running apps</li>
    <li><strong>State Consistency</strong> - Flag transitions must maintain graph integrity even during exceptions</li>
    <li><strong>Execution Order</strong> - Topological guarantees are critical for predictable behavior</li>
    <li><strong>Test Coverage</strong> - Complex dependency scenarios in topology.test.ts validate optimizations</li>
  </ol>
</instructions>
</core-package-context>