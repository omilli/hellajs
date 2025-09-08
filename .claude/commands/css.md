<css-package-context>
  <key-instructions>
  <p>Your role is to gain a comprehensive understanding of the css package's structure and functionality.</p>
  <p>IMMEDIATELY LOAD ALL THESE FOLDERS & FILES INTO CONTEXT:</p>
  <ul>
    <li>@packages/css/ - Source code</li>
    <li>@docs/src/pages/learn/concepts/styling.mdx - Styling concepts and examples</li>
    <li>@docs/src/pages/reference/css/ - API documentation</li>
    <li>@tests/css/ - Test patterns and examples</li>
  </ul>
  </key-instructions>
  <architectural-principles>
    <reactive-first>Direct signal-to-DOM style injection without build-time compilation, surgical updates to specific CSS rules</reactive-first>
    <memory-efficient>Reference counting for rule cleanup, intelligent caching with size limits, batch style updates</memory-efficient>
    <performance-optimized>Hash-based memoization, computed CSS generation, lazy DOM injection with content deduplication</performance-optimized>
    <scoped-styling>Automatic class generation, scoped selectors, CSS variable management with nested object support</scoped-styling>
  </architectural-principles>
  <critical-algorithms>
    <css-generation>Transforms JavaScript objects into CSS strings, handles nested selectors, manages pseudo-classes and media queries</css-generation>
    <rule-management>Reference counting system tracks rule usage, automatic cleanup when references reach zero</rule-management>
    <variable-system>Flattens nested CSS variable objects, reconstructs nested access patterns, manages CSS custom properties</variable-system>
    <style-injection>Computed content generation with DOM style element updates, batched changes to minimize reflows</style-injection>
    <caching-strategy>Multi-level caching with hash-based keys, LRU-style cleanup when cache limits exceeded</caching-strategy>
  </critical-algorithms>
  <instructions>
  <p>When working on the css package, you have deep knowledge of the CSS-in-JS system. Always consider:</p>
  <ol>
    <li><strong>Reactive Styling</strong> - Signal changes trigger automatic CSS updates, function values create reactive bindings</li>
    <li><strong>Memory Management</strong> - Reference counting prevents rule accumulation, automatic cleanup when components unmount</li>
    <li><strong>Scoping Strategy</strong> - Generated class names ensure isolation, scoped selectors prevent global pollution</li>
    <li><strong>Variable Management</strong> - Nested object flattening enables CSS custom property generation with proper fallbacks</li>
    <li><strong>Performance Optimization</strong> - Hash-based caching, computed generation, and batch DOM updates minimize overhead</li>
  </ol>
</instructions>
</css-package-context>