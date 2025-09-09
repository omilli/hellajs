<store-package-context>
  <key-instructions>
  <p>Your role is to gain a comprehensive understanding of the store package's structure and functionality.</p>
  <p>IMMEDIATELY LOAD ALL THESE FOLDERS & FILES INTO CONTEXT:</p>
  <ul>
    <li>@packages/store/ - Source code</li>
    <li>@docs/src/pages/learn/concepts/state.mdx - Concepts and examples</li>
    <li>@docs/src/pages/reference/store/ - API documentation</li>
    <li>@tests/store/ - Test suite</li>
  </ul>
  </key-instructions>
  <architectural-principles>
    <reactive-composition>Built on the core reactive system, each store property becomes an independently reactive signal or nested store</reactive-composition>
    <fine-grained-updates>Only properties that change trigger re-computation, avoiding cascade updates common in monolithic state systems</fine-grained-updates>
    <type-safety>Full TypeScript support with intelligent property transformation and readonly controls</type-safety>
    <nested-reactivity>Supports deeply nested stores with hierarchical state structures and reactivity at every level</nested-reactivity>
    <flexible-readonly>Configurable readonly properties - all properties, specific properties, or no readonly restrictions</flexible-readonly>
  </architectural-principles>
  <critical-algorithms>
    <store-creation>Transforms object properties into reactive primitives: primitives become signals, objects become nested stores, functions remain as-is</store-creation>
    <property-transformation>defineStoreProperty creates reactive proxy that intercepts access and converts properties to signals/stores on demand</property-transformation>
    <apply-update>Intelligently updates targets: signals via setter, nested stores via update method, with type-safe value application</apply-update>
    <partial-updates>update() method performs shallow merging while respecting reactive change detection for nested properties</partial-updates>
    <computed-snapshots>computed property provides reactive snapshot of entire store state, converting signals back to plain values</computed-snapshots>
    <deep-cleanup>Recursive cleanup of all nested reactive values and stores for proper memory management</deep-cleanup>
  </critical-algorithms>
  <instructions>
  <p>When working on the store package, you have deep knowledge of the reactive state system. Always consider:</p>
  <ol>
    <li><strong>Reactivity Granularity</strong> - Each property is independently reactive, changes propagate only through affected paths</li>
    <li><strong>Type System Integration</strong> - Store types must correctly transform T properties into Signal&lt;T&gt; or Store&lt;T&gt; types</li>
    <li><strong>Nested Store Behavior</strong> - Deep updates must work correctly with partial application and proper merging</li>
    <li><strong>Readonly Enforcement</strong> - Readonly properties must be enforced at runtime with clear error messages</li>
    <li><strong>Integration Testing</strong> - Changes affect state management patterns used throughout applications</li>
    <li><strong>Performance Impact</strong> - Store creation and property access are on critical paths for component rendering</li>
  </ol>
</instructions>
</store-package-context>