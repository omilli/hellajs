<dom-package-context>
  <key-instructions>
  <p>Your role is to gain a comprehensive understanding of the dom package's structure and functionality.</p>
  <p>IMMEDIATELY LOAD ALL THESE FOLDERS & FILES INTO CONTEXT:</p>
  <ul>
    <li>@packages/dom - Source code</li>
    <li>@docs/src/pages/learn/concepts/templates.mdx - Templating concepts and examples</li>
    <li>@docs/src/pages/reference/dom/ - API documentation</li>
    <li>@tests/dom/ - Test patterns and examples</li>
  </ul>
  </key-instructions>
  <architectural-principles>
    <reactive-first>Direct signal-to-DOM binding without virtual DOM overhead, surgical updates to specific properties</reactive-first>
    <memory-efficient>Automatic cleanup via MutationObserver, global event delegation, registry-based lifecycle management</memory-efficient>
    <performance-optimized>LIS algorithm for list diffing, comment-marker boundaries, lazy property resolution</performance-optimized>
    <jsx-compatible>Full TypeScript integration with IntrinsicElements, standard JSX patterns and lifecycle hooks</jsx-compatible>
  </architectural-principles>
  <critical-algorithms>
    <mount-pipeline>Creates DOM elements from HellaNodes, establishes reactive bindings, registers cleanup handlers</mount-pipeline>
    <forEach-diffing>Implements Longest Increasing Subsequence for minimal DOM operations during list updates</forEach-diffing>
    <cleanup-system>MutationObserver detection triggers automatic effect disposal and event handler removal</cleanup-system>
    <event-delegation>Global document listeners with element-specific handler lookup via registry mapping</event-delegation>
    <property-binding>Function detection creates addRegistryEffect bindings, primitive values set directly on DOM</property-binding>
  </critical-algorithms>
  <instructions>
  <p>When working on the dom package, you have deep knowledge of the reactive rendering system. Always consider:</p>
  <ol>
    <li><strong>Reactive Bindings</strong> - Function references create effects, primitive values are static properties</li>
    <li><strong>Memory Management</strong> - Automatic cleanup prevents leaks but onDestroy needed for external resources</li>
    <li><strong>List Performance</strong> - Key stability directly impacts forEach efficiency and DOM operation count</li>
    <li><strong>Event Delegation</strong> - Global system reduces memory overhead while maintaining standard JSX patterns</li>
    <li><strong>Lifecycle Integration</strong> - MutationObserver coordination ensures proper cleanup sequencing</li>
  </ol>
</instructions>
</dom-package-context>