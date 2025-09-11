<technical-internals>
  <core-architecture>
    <reactive-rendering-system>
      <hellanode-architecture>
        The DOM system is built around HellaNode (Virtual Node) objects
        with three core properties: tag (element name or fragment identifier), props (attributes, properties, lifecycle hooks), and children (array of child HellaNodes or primitive values). Unlike virtual DOM systems that diff entire trees, HellaNodes serve as templates establishing reactive connections during render, binding signal changes directly to specific DOM properties without intermediate virtual representations.
      </hellanode-architecture>
      <mount-pipeline>
        The mount() function initiates the reactive rendering pipeline by accepting HellaNode objects or component functions, replacing target DOM elements entirely. The renderNode() core algorithm creates real DOM elements, processes reactive properties through effect registration, establishes event delegation, and recursively mounts children. This pipeline ensures one-time HellaNode-to-DOM transformation with automatic reactive property updates.
      </mount-pipeline>
      <reactive-property-binding>
        Properties containing function references automatically create reactive bindings through addRegistryEffect(). When signals change, only specific DOM properties update without re-rendering entire components. Static properties are set directly during initial render, while reactive properties establish effect-based update cycles that persist throughout the element's lifecycle.
      </reactive-property-binding>
    </reactive-rendering-system>
    <list-rendering-engine>
      <foreach-algorithm>
        The forEach() function implements sophisticated list diffing using key-based tracking and the Longest Increasing Subsequence (LIS) algorithm. Items are tracked via explicit keys or implicit indices, enabling O(1) node lookup through keyToNode Map structures. The algorithm minimizes DOM operations by reusing existing nodes, efficiently removing unused elements, and repositioning items with minimal tree manipulation.
      </foreach-algorithm>
      <diffing-strategies>
        List updates employ multiple optimization strategies: ultra-fast path for identical arrays (no DOM changes), fast path for first render (append all nodes), complete replacement when no keys match, and complex LIS-based reordering for minimal DOM operations. The algorithm handles empty arrays, maintains insertion order, and preserves element references across updates.
      </diffing-strategies>
      <key-based-optimization>
        Explicit keys (element.props?.key) enable stable node tracking across list mutations. When keys are absent, indices serve as implicit keys. The keyToNode Map provides O(1) lookup for existing elements during updates. Key stability directly impacts performance: stable keys (database IDs) prevent unnecessary re-renders, while index-based keys cause cascading updates during reordering.
      </key-based-optimization>
    </list-rendering-engine>
    <event-system>
      <global-delegation>
        Event handling uses global delegation with a single listener per event type registered on document. The setNodeHandler() function maps element references to event handlers in a global registry. When events bubble to document level, delegatedHandler() looks up the appropriate handler and executes it with proper context, reducing memory overhead and enabling automatic cleanup.
      </global-delegation>
      <handler-registration>
        Event handlers are registered through props with "on" prefix (onClick, onInput, etc.). The system automatically converts camelCase event names to lowercase for DOM compatibility. Handler functions are stored in element-specific registries, enabling targeted cleanup when elements are removed without affecting other event listeners.
      </handler-registration>
    </event-system>
  </core-architecture>
  <memory-management>
    <automatic-cleanup-system>
      <mutation-observer-integration>
        A global MutationObserver watches for DOM node removals, triggering automatic cleanup of associated reactive effects and event handlers. The observer monitors childList changes with subtree observation, detecting when elements are removed from anywhere in the document tree. This prevents memory leaks without requiring manual cleanup calls from user code.
      </mutation-observer-integration>
      <node-registry-architecture>
        The nodeRegistry is a first-class API object that manages DOM node metadata through a Map-based association system. Registry entries contain optional effects Set and events Map collections. The nodeRegistry.get() method creates entries on-demand, while nodeRegistry.clean() handles disposal. The system provides structured access through nodeRegistry.addEffect() and nodeRegistry.addEvent() methods for lifecycle management.
      </node-registry-architecture>
      <effect-lifecycle-management>
        Effects created through nodeRegistry.addEffect() are automatically disposed when their host elements are removed from DOM. The cleanup system iterates through registry entries via nodeRegistry.clean(), disposing all effects and removing event handlers. This automatic lifecycle management ensures reactive bindings don't outlive their associated DOM elements.
      </effect-lifecycle-management>
    </automatic-cleanup-system>
    <lifecycle-hooks>
      <update-lifecycle>
        The onUpdate hook executes after reactive property changes update DOM elements. This provides opportunities for post-update logic, DOM measurements, or side effects that depend on updated element state. Update hooks are called synchronously after property updates but before the next effect cycle.
      </update-lifecycle>
      <destruction-lifecycle>
        The onDestroy hook executes when elements are removed from DOM, detected through MutationObserver. Destruction hooks enable cleanup of timers, external subscriptions, or other resources not automatically managed by the reactive system. These hooks execute before automatic effect disposal, allowing custom cleanup logic.
      </destruction-lifecycle>
    </lifecycle-hooks>
  </memory-management>
  <rendering-algorithms>
    <property-resolution>
      <reactive-vs-static-detection>
        The renderNode() function distinguishes between static values and reactive functions during property processing. Functions trigger nodeRegistry.addEffect() to create reactive bindings, while primitive values are set directly on DOM elements. This detection enables automatic reactivity without explicit declarations from user code.
      </reactive-vs-static-detection>
      <property-application-pipeline>
        Properties are processed through renderProp() which handles different property types: DOM attributes (setAttribute), element properties (direct assignment), boolean attributes (removeAttribute/setAttribute), and style objects (individual style property assignment). Special handling exists for className, htmlFor, and other React-style property mappings.
      </property-application-pipeline>
    </property-resolution>
    <child-resolution>
      <dynamic-content-handling>
        Child elements support multiple types: primitive values (converted to text nodes), HellaNode objects (recursively rendered), function references (reactive content), and arrays (flattened and processed). Dynamic children use comment markers to define content boundaries, enabling efficient replacement without affecting surrounding elements.
      </dynamic-content-handling>
      <fragment-processing>
        Fragment HellaNodes (tag === FRAGMENT) create DocumentFragment containers that insert their children directly into the parent without wrapper elements. This enables multiple root elements and semantic HTML structure without unnecessary DOM nesting. Fragments are processed recursively with the same child resolution logic.
      </fragment-processing>
    </child-resolution>
    <text-node-optimization>
      <primitive-value-handling>
        String, number, and boolean values are converted to text nodes through createTextNode(). Null and undefined values create empty text nodes to maintain DOM structure consistency. This optimization avoids wrapper elements for simple content and enables direct text updates through reactive bindings.
      </primitive-value-handling>
      <content-replacement-strategy>
        Dynamic text content uses textContent property updates rather than node replacement when possible. For complex dynamic content (multiple child types), the system uses comment-bounded regions and replaces entire sections. This balances performance with correctness for different update scenarios.
      </content-replacement-strategy>
    </text-node-optimization>
  </rendering-algorithms>
  <performance-optimizations>
    <list-diffing-complexity>
      <computational-analysis>
        List diffing operations: Key lookup O(1) through Map structure, LIS computation O(n log k) where k is LIS length, DOM operations O(moves) where moves are actual repositioning operations. Fast paths eliminate computation entirely: identical array check O(n), complete replacement O(n), first render O(n). The algorithm optimizes for common cases while handling complex reordering efficiently.
      </computational-analysis>
      <memory-patterns>
        KeyToNode maps reuse existing entries across updates, preventing allocation churn. Node references are maintained between render cycles, avoiding DOM queries. LIS computation uses temporary arrays that are garbage collected after each update. Overall memory usage scales linearly with active list length rather than update frequency.
      </memory-patterns>
    </list-diffing-complexity>
    <reactive-binding-efficiency>
      <effect-granularity>
        Reactive effects are created per property per element, enabling surgical updates to specific DOM attributes without affecting other properties. This granular approach prevents unnecessary work when multiple properties exist on the same element. Effect disposal happens automatically without manual tracking or cleanup calls.
      </effect-granularity>
      <update-batching>
        Property updates leverage the core reactivity system's batching mechanism, ensuring multiple signal changes trigger single DOM update cycles. This prevents layout thrashing and reduces browser reflow/repaint operations. Updates are applied synchronously within effect execution for immediate DOM consistency.
      </update-batching>
    </reactive-binding-efficiency>
    <event-delegation-benefits>
      <memory-footprint-reduction>
        Global event delegation maintains constant memory usage regardless of element count. Single event listeners per type replace per-element handler registration. Handler lookup through element registry is O(1) with minimal memory overhead. This approach scales efficiently with application size.
      </memory-footprint-reduction>
      <performance-characteristics>
        Event handling performance remains constant regardless of DOM tree depth. Handler execution is direct function calls without event system overhead. Automatic cleanup through registry disposal prevents handler accumulation. The system provides native DOM event performance with automatic memory management.
      </performance-characteristics>
    </event-delegation-benefits>
  </performance-optimizations>
  <advanced-algorithms>
    <longest-increasing-subsequence>
      <algorithm-implementation>
        The LIS algorithm identifies the longest sequence of elements that maintain their relative positions during list reordering. Binary search optimization achieves O(n log k) complexity for finding optimal insertion points. The algorithm constructs previous indices array for sequence reconstruction and identifies elements that don't require DOM movement.
      </algorithm-implementation>
      <dom-movement-minimization>
        Elements not in the LIS are marked for repositioning through toMove Set. DOM operations execute in reverse order to maintain proper insertion positions using insertBefore() with anchor references. This approach minimizes actual DOM manipulations while preserving correct element ordering.
      </dom-movement-minimization>
    </longest-increasing-subsequence>
    <comment-marker-system>
      <dynamic-content-boundaries>
        Dynamic content regions are marked with HTML comments containing boundary identifiers (START, END, FOR_EACH). These markers enable precise content replacement without affecting adjacent elements. The system maintains marker pairs for each dynamic region and replaces content between markers during updates.
      </dynamic-content-boundaries>
      <marker-management>
        Comment markers are created through createComment() and inserted at content boundaries. During updates, the system locates marker pairs and replaces intervening content. Markers themselves are preserved across updates, maintaining stable reference points for content replacement operations.
      </marker-management>
    </comment-marker-system>
    <registry-architecture>
      <element-association-mapping>
        The nodeRegistry object maintains Map-based associations between DOM elements and their reactive metadata through the nodes property. Registry entries contain effects Sets and events Maps for comprehensive lifecycle tracking. The get() method provides lazy entry creation, while clean() handles disposal coordination.
      </element-association-mapping>
      <cleanup-coordination>
        Registry cleanup through nodeRegistry.clean() iterates through all effects and event handlers associated with removed elements. Effect disposal calls their cleanup functions, while event handlers are removed from global delegation registry. This coordinated cleanup prevents memory leaks and ensures complete resource disposal.
      </cleanup-coordination>
    </registry-architecture>
  </advanced-algorithms>
  <integration-patterns>
    <jsx-compatibility>
      <type-system-integration>
        Global JSX namespace extensions provide full TypeScript integration with IntrinsicElements mapping to HTMLAttributeMap. Element and ElementAttributesProperty interfaces enable proper prop typing. ElementChildrenAttribute interface supports children prop validation. This integration enables compile-time checking of JSX usage.
      </type-system-integration>
      <component-function-pattern>
        Components are plain functions returning HellaNode objects, enabling composition without class inheritance or special syntax. Props are passed as function arguments with full TypeScript support. Component functions can create local state through signals and establish reactive bindings through property functions.
      </component-function-pattern>
    </jsx-compatibility>
    <reactive-system-integration>
      <signal-binding-automation>
        Function properties automatically create reactive bindings through effect registration. Signal reads within property functions establish automatic dependencies. Property updates trigger through signal change propagation without explicit subscription management. This integration provides transparent reactivity without boilerplate code.
      </signal-binding-automation>
      <effect-lifecycle-coordination>
        DOM effects integrate with the core effect system for proper disposal and dependency tracking. Effect cleanup happens automatically through MutationObserver detection. Nested effects (effects creating other effects) are handled correctly through proper cleanup sequencing and registry management.
      </effect-lifecycle-coordination>
    </reactive-system-integration>
  </integration-patterns>
  <api-architecture>
    <noderegistry-api>
      <public-interface>
        The nodeRegistry is exported as a first-class API object providing structured access to DOM node lifecycle management. The interface includes: nodes Map for direct registry access, get() for lazy entry retrieval, addEffect() for reactive binding registration, addEvent() for event handler tracking, clean() for manual cleanup, and observer for MutationObserver access. This structured approach replaces function-based access patterns with explicit method calls.
      </public-interface>
      <registry-entry-structure>
        NodeRegistryItem entries contain optional effects Set and events Map properties. The effects Set holds cleanup functions returned by the core effect system. The events Map associates event types with their handler functions for delegation lookup. Entries are created lazily on first access and removed during cleanup to prevent memory accumulation.
      </registry-entry-structure>
      <lifecycle-coordination>
        The nodeRegistry coordinates automatic cleanup through MutationObserver integration. The observer monitors document.body with childList and subtree options, triggering cleanup in microtasks for performance. Cleanup coordination ensures effects are disposed before event handlers are removed, maintaining proper sequencing for resource cleanup.
      </lifecycle-coordination>
    </noderegistry-api>
  </api-architecture>
  <edge-case-handling>
    <list-update-scenarios>
      <empty-array-handling>
        Empty arrays trigger complete content clearing through textContent assignment and comment marker insertion. This fast path avoids iteration overhead and ensures clean DOM state. Empty-to-populated and populated-to-empty transitions are handled efficiently through dedicated code paths.
      </empty-array-handling>
      <key-collision-management>
        Duplicate keys within the same list are handled by implicit fallback to index-based tracking. Key uniqueness is not enforced, but performance degrades with collisions due to Map lookup conflicts. The system maintains functional correctness even with suboptimal key strategies.
      </key-collision-management>
      <dynamic-key-changes>
        When item keys change between renders, the system treats them as different items, potentially causing unnecessary DOM operations. Key stability is crucial for optimal performance. The algorithm handles key changes correctly but may perform suboptimal DOM manipulations.
      </dynamic-key-changes>
    </list-update-scenarios>
    <cleanup-error-handling>
      <observer-failure-recovery>
        MutationObserver failures are handled gracefully with error boundaries that prevent cleanup system crashes. Observer reconnection logic maintains cleanup functionality across DOM mutations. Failed cleanup attempts are logged but don't affect application functionality.
      </observer-failure-recovery>
      <registry-corruption-protection>
        Registry entry corruption (missing effects or events Sets) is handled through defensive programming with null checks and Set creation. Cleanup operations are protected against missing registry entries. Registry state is validated during critical operations to maintain system integrity.
      </registry-corruption-protection>
    </cleanup-error-handling>
  </edge-case-handling>
</technical-internals>