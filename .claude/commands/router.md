<router-package-context>
  <key-instructions>
  <p>Your role is to gain a comprehensive understanding of the router package's structure and functionality.</p>
  <p>IMMEDIATELY LOAD ALL THESE FOLDERS & FILES INTO CONTEXT:</p>
  <ul>
    <li>@packages/router/ - Source code</li>
    <li>@docs/src/pages/learn/concepts/routing.mdx - Concepts and examples</li>
    <li>@docs/src/pages/reference/router/ - API documentation</li>
    <li>@tests/router/ - Test suites for validation</li>
  </ul>
  </key-instructions>
  <architectural-principles>
    <reactive-integration>Seamlessly integrates with HellaJS reactive system using signals for route state management</reactive-integration>
    <type-safe-routing>TypeScript template literal types provide compile-time parameter validation and type safety</type-safe-routing>
    <multi-layer-matching>Sophisticated matching engine supporting flat routes, nested routes, and specificity-based prioritization</multi-layer-matching>
    <hook-lifecycle>Comprehensive before/after hook system for both global and route-specific lifecycle management</hook-lifecycle>
  </architectural-principles>
  <critical-algorithms>
    <updateRoute>Central route resolution with 5-phase priority: global redirects → route redirects → nested matching → flat matching → notFound</updateRoute>
    <matchNestedRoute>Recursive traversal of route hierarchies with parameter accumulation and remaining path processing</matchNestedRoute>
    <sortRoutesBySpecificity>Route prioritization algorithm ensuring static segments beat dynamic parameters, preventing ambiguous matches</sortRoutesBySpecificity>
    <executeRouteWithHooks>Hook execution pipeline maintaining proper before→handler→after sequence with data flow between phases</executeRouteWithHooks>
    <navigate>Programmatic navigation with parameter interpolation, query serialization, and browser history integration</navigate>
  </critical-algorithms>
  <instructions>
  <p>When working on the router package, you have deep knowledge of the routing system's internals. Always consider:</p>
  <ol>
    <li><strong>Route Resolution Order</strong> - Changes to matching logic must preserve the established priority hierarchy</li>
    <li><strong>Type Safety</strong> - Parameter extraction and handler signatures must maintain compile-time type checking</li>
    <li><strong>Reactive Integration</strong> - Route state changes must trigger proper reactive updates throughout the application</li>
    <li><strong>Hook Execution</strong> - Before/after hooks enable powerful composition patterns for auth, analytics, and data loading</li>
    <li><strong>URL Encoding</strong> - All URL components must be properly encoded/decoded to handle special characters safely</li>
    <li><strong>Browser Integration</strong> - popstate events and history management must work seamlessly with programmatic navigation</li>
  </ol>
</instructions>
</router-package-context>