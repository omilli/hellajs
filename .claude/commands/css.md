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
    <standalone-first>Framework-agnostic CSS-in-JS without reactive dependencies, static object processing with synchronous DOM updates</standalone-first>
    <memory-efficient>Manual reference counting for rule cleanup, simple caching with size limits, immediate style updates</memory-efficient>
    <performance-optimized>String-based memoization, eager CSS generation, synchronous DOM injection with rule deduplication</performance-optimized>
    <scoped-styling>Automatic class generation with base36 counters, scoped selectors, CSS variable management with nested object flattening</scoped-styling>
  </architectural-principles>
  <critical-algorithms>
    <css-generation>Transforms JavaScript objects into CSS strings using process() function, handles nested selectors with & substitution, converts camelCase to kebab-case properties</css-generation>
    <rule-management>Reference counting system tracks rule usage, manual cleanup via cssRemove() when references reach zero</rule-management>
    <variable-system>Flattens nested objects with flattenVars(), reconstructs nested access with var() references, applies CSS custom properties to :root</variable-system>
    <style-injection>Immediate content generation with single DOM style element updates, synchronous rule application to #hella-css element</style-injection>
    <caching-strategy>Dual-cache system with string-based keys, simple size-based eviction for cssVars cache (100 entry limit)</caching-strategy>
  </critical-algorithms>
  <instructions>
  <p>When working on the css package, you have deep knowledge of the standalone CSS-in-JS system. Always consider:</p>
  <ol>
    <li><strong>Static Styling</strong> - Plain JavaScript objects processed without reactive bindings, dynamic styling requires explicit css() re-calls</li>
    <li><strong>Memory Management</strong> - Reference counting prevents rule accumulation, manual cleanup via cssRemove() when styles no longer needed</li>
    <li><strong>Scoping Strategy</strong> - Auto-incrementing class names (c1, c2, c3...) ensure isolation, scoped option creates nested selectors (.scope .class)</li>
    <li><strong>Variable Management</strong> - Nested object flattening with dot-to-dash conversion, CSS custom properties applied to :root element</li>
    <li><strong>Performance Optimization</strong> - String-based caching, immediate generation, and synchronous DOM updates for predictable behavior</li>
  </ol>
</instructions>
</css-package-context>