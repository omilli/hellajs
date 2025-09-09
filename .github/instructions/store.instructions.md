---
applyTo: "{packages/store/**,tests/store/**}"
---

<technical-internals>
  <store-architecture>
    <reactive-proxy-system>
      <property-transformation>
        The store factory transforms plain JavaScript objects into reactive proxy structures through recursive property analysis. Each property undergoes type-based conversion: primitives and arrays become reactive signals, nested plain objects become recursive store instances, and functions remain unchanged to preserve their original behavior. The transformation occurs once during store creation, establishing a reactive graph that handles all subsequent property access and mutation operations.
      </property-transformation>
      <proxy-structure>
        store instances are reactive proxies that maintain bidirectional relationships between original object structure and reactive primitives. The proxy intercepts property access patterns, delegating reads to underlying signals and writes to signal setters. This design enables transparent reactivity where object property syntax automatically triggers dependency tracking and change propagation without requiring explicit signal access patterns.
      </proxy-structure>
      <nested-store-hierarchy>
        Nested objects create recursive Store hierarchies where each level maintains independent reactive state while preserving parent-child relationships for update propagation. The hierarchy enables granular reactivity where changes to deeply nested properties only trigger computations dependent on that specific path, avoiding unnecessary re-evaluations of unrelated store sections.
      </nested-store-hierarchy>
    </reactive-proxy-system>
    <type-system-integration>
      <conditional-type-mapping>
        The store type system uses advanced TypeScript conditional types to preserve exact object structure while adding reactivity. The mapping transforms each property K to appropriate reactive primitive: functions remain as-is, arrays and primitives become signals or readonly signals based on readonly configuration, and nested objects become store instances. This type transformation maintains complete type safety while enabling reactive access patterns.
      </conditional-type-mapping>
      <readonly-type-enforcement>
        Readonly functionality operates through dual-layer enforcement: compile-time TypeScript errors prevent invalid mutations, and runtime checks throw errors for readonly property access attempts. The readonly key type computation computes which properties should be readonly based on store options configuration, enabling both selective and complete readonly store creation with full type safety.
      </readonly-type-enforcement>
      <partial-deep-updates>
        The partial deep utility type enables type-safe partial updates by recursively making all properties optional while preserving nested structure. This allows update operations to accept incomplete objects that merge with existing state, supporting both shallow and deep partial updates while maintaining TypeScript inference for nested property paths.
      </partial-deep-updates>
    </type-system-integration>
    <signal-integration>
      <core-dependency-system>
        Store properties leverage the core reactive system's dependency tracking by wrapping values in reactive signals that participate in the dependency graph. Each store property becomes a node in the reactive DAG, enabling fine-grained dependency tracking where computations only depend on accessed properties rather than entire store objects. This integration provides automatic reactivity without requiring manual dependency management.
      </core-dependency-system>
      <change-propagation-delegation>
        Store updates delegate change propagation to underlying signals, ensuring consistent behavior with core reactive primitives. When store properties change, the signal's change detection and propagation mechanisms handle dependency invalidation and effect scheduling. This delegation maintains behavioral consistency across the reactive system while adding store-specific update patterns like partial updates and state replacement.
      </change-propagation-delegation>
      <computed-signal-exposure>
        Each store exposes a computed signal that provides reactive snapshots of the entire store state. This computed signal automatically tracks access to individual store properties, creating dependencies on the specific properties accessed during computation. The snapshot feature enables reactive integration with systems expecting plain objects while maintaining reactivity for the accessed subset of store properties.
      </computed-signal-exposure>
    </signal-integration>
  </store-architecture>
  <update-mechanisms>
    <property-update-system>
      <direct-property-mutation>
        Individual store properties support direct mutation through signal setter syntax, enabling fine-grained updates that only trigger dependent computations. Direct property updates bypass store-level update logic, providing optimal performance for single property changes. The mutation directly invokes the underlying signal's setter, maintaining consistency with core reactive behavior while preserving store proxy semantics.
      </direct-property-mutation>
      <nested-property-delegation>
        Nested store properties delegate updates to child store instances, enabling hierarchical update propagation without parent store involvement. This delegation pattern allows deep property mutations to occur independently while maintaining proper dependency tracking at each nesting level. The system preserves update efficiency by avoiding unnecessary traversal of unmodified store branches during propagation.
      </nested-property-delegation>
      <update-conflict-resolution>
        When updates target both parent and child properties simultaneously, the system resolves conflicts through precedence rules that prioritize deeper property paths. Nested store updates take precedence over parent-level updates for the same logical property path, ensuring that specific property changes override more general updates. This resolution maintains predictable behavior during complex update operations involving multiple nesting levels.
      </update-conflict-resolution>
    </property-update-system>
    <bulk-update-operations>
      <complete-state-replacement>
        The set method performs complete store state replacement by iterating through all original property keys and applying new values to corresponding store properties. The replacement process handles both primitive values and nested objects, delegating nested updates to child stores while directly updating primitive properties. This operation maintains store structure while replacing all property values, preserving reactive relationships and dependency tracking.
      </complete-state-replacement>
      <partial-deep-merging>
        The update method implements partial deep merging that recursively combines new values with existing store state. The merging process distinguishes between primitive values requiring direct replacement and nested objects requiring recursive merging. For nested objects, the system delegates to child store update methods, enabling deep partial updates that preserve unspecified properties while updating only the provided values.
      </partial-deep-merging>
      <merge-strategy-selection>
        Update operations select appropriate merge strategies based on property types and target store structures. Primitive properties receive direct value replacement, nested stores receive recursive update delegation, and mixed scenarios resolve through type analysis of both existing and incoming values. The strategy selection ensures optimal update performance while maintaining consistent behavior across different store configurations and nesting patterns.
      </merge-strategy-selection>
    </bulk-update-operations>
    <update-validation-system>
      <readonly-enforcement-mechanism>
        Readonly property updates undergo validation that checks both selective readonly arrays and complete readonly configuration. The enforcement mechanism examines property keys against readonly configuration and throws errors for attempted mutations of protected properties. This validation occurs before signal updates, preventing invalid state changes while providing clear error messages for debugging readonly violations.
      </readonly-enforcement-mechanism>
      <type-compatibility-checking>
        Update operations validate type compatibility between incoming values and existing store property types, ensuring that updates maintain expected type relationships. The validation process handles both primitive type checking and complex object structure validation, preventing updates that would break store type contracts. This checking integrates with TypeScript inference to provide both compile-time and runtime type safety.
      </type-compatibility-checking>
      <nested-validation-propagation>
        Validation for nested store updates propagates validation rules through the store hierarchy, ensuring that child store updates respect parent-level readonly configurations and type constraints. The propagation mechanism maintains validation consistency across nesting levels while allowing child stores to enforce their own validation rules. This hierarchical validation ensures that complex nested updates maintain data integrity throughout the store structure.
      </nested-validation-propagation>
    </update-validation-system>
  </update-mechanisms>
  <memory-management>
    <lifecycle-management>
      <store-initialization-process>
        Store creation follows a deterministic initialization process that analyzes initial object structure, creates appropriate reactive primitives, and establishes proxy relationships. The initialization process iterates through object properties, applying transformation logic based on property types and configuration options. This process completes store setup in a single pass, establishing all reactive relationships before the store becomes available for use.
      </store-initialization-process>
      <dependency-graph-construction>
        During store initialization, property transformations create nodes in the reactive dependency graph that integrate with the core tracking system. Each signal created during transformation becomes a potential dependency source for computations and effects. The construction process ensures that store properties participate correctly in dependency tracking without requiring additional setup or manual registration.
      </dependency-graph-construction>
      <proxy-lifecycle-binding>
        Store proxies maintain lifecycle binding with underlying reactive primitives through shared cleanup responsibilities. The proxy structure holds references to all created signals and nested stores, enabling coordinated cleanup when the store lifecycle ends. This binding ensures that proxy disposal properly cleans up all associated reactive resources without leaving orphaned dependencies or memory leaks.
      </proxy-lifecycle-binding>
    </lifecycle-management>
    <cleanup-orchestration>
      <recursive-cleanup-traversal>
        Store cleanup implements recursive traversal through the store hierarchy, identifying and disposing of all reactive resources including signals, nested stores, and computed values. The traversal follows object property relationships, visiting each nested store and invoking its cleanup method before disposing of the parent store's resources. This recursive approach ensures complete cleanup of complex store structures without leaving unreferenced reactive primitives.
      </recursive-cleanup-traversal>
      <signal-disposal-coordination>
        Individual signal cleanup within stores coordinates with the core reactive system's disposal mechanisms, ensuring that signal dependencies are properly removed from the dependency graph. The coordination process removes the signal from all subscriber lists, clears its dependency links, and marks it as disposed to prevent future updates. This coordination maintains dependency graph integrity during store cleanup operations.
      </signal-disposal-coordination>
      <cleanup-safety-mechanisms>
        Store cleanup includes safety mechanisms that handle cleanup during active updates, concurrent access, and partial cleanup failures. The safety mechanisms use atomic operations for cleanup state changes and ensure that partially cleaned stores remain in valid states if cleanup fails. These mechanisms prevent cleanup-related errors from corrupting remaining reactive state or causing memory corruption.
      </cleanup-safety-mechanisms>
    </cleanup-orchestration>
    <memory-optimization-strategies>
      <property-reuse-patterns>
        Store implementation reuses reactive primitives where possible, avoiding duplicate signal creation for identical property configurations. The reuse patterns analyze property characteristics and readonly settings to identify opportunities for shared signal instances. This optimization reduces memory overhead for stores with similar property configurations while maintaining proper isolation of store-specific state.
      </property-reuse-patterns>
      <lazy-nested-store-creation>
        Nested store creation uses lazy initialization where child stores are created only when their properties are first accessed rather than during parent store initialization. This lazy approach reduces initial memory overhead for large store structures and improves initialization performance for stores with deeply nested but rarely accessed properties. The lazy creation maintains transparent access semantics while optimizing resource utilization.
      </lazy-nested-store-creation>
      <reference-management-optimization>
        Store reference management optimizes memory usage through careful handling of circular references, parent-child relationships, and cleanup responsibilities. The management system uses weak references where appropriate to prevent circular reference memory leaks while maintaining necessary relationships for update propagation and cleanup coordination. This optimization enables complex store structures without memory management complications.
      </reference-management-optimization>
    </memory-optimization-strategies>
  </memory-management>
  <readonly-system>
    <configuration-processing>
      <selective-readonly-analysis>
        Selective readonly configuration processes key arrays to identify which properties should become readonly, handling both string keys and symbol keys with proper type inference. The analysis validates key existence in the target object and creates readonly mappings that guide property transformation during store creation. This processing enables granular readonly control while maintaining type safety for property access patterns.
      </selective-readonly-analysis>
      <complete-readonly-transformation>
        Complete readonly mode transforms all store properties into readonly signals while preserving nested store structures and method access. The transformation creates computed signals instead of writable signals for all properties, enabling reactive reads while preventing mutations. This mode maintains full store functionality except for property mutations, providing immutable reactive state with complete type safety.
      </complete-readonly-transformation>
      <readonly-inheritance-rules>
        Readonly configuration inherits through nested store hierarchies according to explicit inheritance rules that balance security with usability. Child stores respect parent readonly configurations for inherited properties while allowing independent readonly settings for child-specific properties. These inheritance rules ensure consistent readonly behavior across store hierarchies while supporting flexible readonly configurations for different nesting levels.
      </readonly-inheritance-rules>
    </configuration-processing>
    <enforcement-mechanisms>
      <compile-time-prevention>
        TypeScript integration provides compile-time prevention of readonly property mutations through conditional type mapping that removes setter capabilities from readonly properties. The type system transformation ensures that readonly properties only expose getter functionality, causing TypeScript errors for attempted mutations during development. This prevention catches readonly violations early in the development cycle without runtime overhead.
      </compile-time-prevention>
      <runtime-validation-system>
        Runtime validation provides backup enforcement for readonly properties through setter interception and error throwing. The validation system checks property access attempts against readonly configuration and throws descriptive errors for invalid mutation attempts. This runtime system handles cases where TypeScript checking may be bypassed and provides clear error messages for debugging readonly violations in development and production.
      </runtime-validation-system>
      <readonly-signal-implementation>
        Readonly properties use computed signals instead of writable signals, leveraging the core reactive system's readonly implementation for consistent behavior. These computed signals wrap the underlying state with read-only access patterns, ensuring that readonly enforcement integrates seamlessly with dependency tracking and change propagation. The implementation maintains full reactivity for readonly properties while preventing state mutations.
      </readonly-signal-implementation>
    </enforcement-mechanisms>
    <readonly-interaction-patterns>
      <partial-readonly-updates>
        Partial updates respect readonly configurations by filtering out readonly properties from update operations, allowing partial updates to succeed for mutable properties while protecting readonly state. The filtering process analyzes update objects against readonly configurations and processes only the mutable subset of provided properties. This pattern enables flexible partial updates without compromising readonly property protection.
      </partial-readonly-updates>
      <readonly-nested-propagation>
        Readonly configurations propagate through nested updates, ensuring that child store updates respect parent-level readonly constraints while maintaining child-specific readonly settings. The propagation mechanism combines parent and child readonly configurations using union logic that preserves the most restrictive constraints. This propagation maintains readonly consistency across store hierarchies during complex nested update operations.
      </readonly-nested-propagation>
      <readonly-method-delegation>
        Store methods like set and update properly delegate readonly checking to individual property setters, ensuring that readonly enforcement occurs at the appropriate granularity level. The delegation pattern allows methods to operate normally while individual property setters handle readonly validation and enforcement. This approach maintains method functionality while preserving readonly protection without duplicating validation logic across different update paths.
      </readonly-method-delegation>
    </readonly-interaction-patterns>
  </readonly-system>
  <performance-characteristics>
    <computational-complexity>
      <property-access-overhead>
        Store property access incurs O(1) overhead through proxy interception and signal delegation, with negligible performance impact compared to plain object access. The proxy pattern adds a single indirection layer that delegates to underlying signals, maintaining consistent access times regardless of store size or nesting depth. This overhead enables reactivity without significant performance degradation for property access patterns.
      </property-access-overhead>
      <update-operation-scaling>
        Store update operations scale linearly with the number of properties being updated, with nested updates adding logarithmic complexity based on nesting depth. Bulk update operations iterate through provided properties once, delegating to appropriate update mechanisms without duplicate work. The scaling characteristics make store updates efficient for typical use cases while providing predictable performance for large store structures.
      </update-operation-scaling>
      <dependency-tracking-impact>
        Store property access participates in dependency tracking with the same O(1) complexity as core signals, ensuring that store usage doesn't degrade reactive system performance. Property access during computation creates dependencies with constant-time overhead, maintaining efficient dependency tracking regardless of store complexity. This integration preserves reactive system performance while enabling store-specific features.
      </dependency-tracking-impact>
    </computational-complexity>
    <memory-usage-patterns>
      <per-property-overhead>
        Each store property incurs fixed memory overhead for signal creation, proxy configuration, and type information storage. The overhead includes signal node structures, dependency tracking metadata, and store-specific configuration data. This per-property cost scales linearly with store size, making memory usage predictable and proportional to store complexity.
      </per-property-overhead>
      <nested-store-amplification>
        Nested stores create memory amplification where each nesting level adds full store overhead including proxy structures and method implementations. The amplification factor depends on nesting depth and branching factor, with deep stores requiring more memory than equivalent flat structures. This pattern encourages balanced store design that avoids excessive nesting while supporting necessary hierarchical organization.
      </nested-store-amplification>
      <cleanup-efficiency>
        Store cleanup operations release memory efficiently through recursive disposal that properly handles circular references and nested structures. The cleanup process ensures complete memory reclamation without leaving orphaned objects or circular reference cycles. Cleanup efficiency makes temporary stores viable for short-lived operations without memory leak concerns.
      </cleanup-efficiency>
    </memory-usage-patterns>
    <optimization-strategies>
      <property-transformation-caching>
        Store creation caches property transformation decisions to avoid redundant type analysis and signal creation for similar store configurations. The caching system recognizes common property patterns and reuses transformation logic while maintaining proper isolation between store instances. This optimization improves store creation performance for applications creating many similar stores.
      </property-transformation-caching>
      <update-path-optimization>
        Store update operations optimize execution paths by analyzing update object structure and selecting efficient update strategies based on property types and nesting patterns. The optimization reduces unnecessary property traversal and minimizes signal update operations for bulk changes. Path optimization maintains update correctness while improving performance for complex update scenarios.
      </update-path-optimization>
      <dependency-minimization>
        Store computed signals minimize dependencies by tracking only accessed properties rather than entire store structures, reducing dependency graph complexity and improving change propagation performance. The minimization strategy ensures that store-level computations only depend on relevant properties, preventing unnecessary re-computation when unrelated properties change. This optimization maintains fine-grained reactivity while avoiding performance degradation.
      </dependency-minimization>
    </optimization-strategies>
  </performance-characteristics>
  <advanced-patterns>
    <store-composition-strategies>
      <hierarchical-store-organization>
        Advanced store patterns use hierarchical organization to model complex domain structures while maintaining clear separation of concerns and efficient update propagation. Hierarchical stores enable modeling of nested business entities with independent lifecycle management and targeted reactivity. The organization strategy supports both top-down and bottom-up update patterns while preserving store isolation and testability.
      </hierarchical-store-organization>
      <store-aggregation-patterns>
        Store aggregation combines multiple independent stores into unified interfaces while preserving individual store characteristics and update semantics. Aggregation patterns enable composition of complex application state from smaller, focused stores without creating monolithic structures. The patterns support selective aggregation where consuming code accesses only relevant store subsets while maintaining reactivity across aggregated boundaries.
      </store-aggregation-patterns>
      <cross-store-dependency-management>
        Advanced applications manage dependencies between independent stores through explicit dependency declaration and coordinated update patterns. Cross-store dependencies enable modeling of complex business relationships while maintaining store isolation and testability. The management patterns include dependency injection, event-based coordination, and computed aggregation that spans multiple store instances.
      </cross-store-dependency-management>
    </store-composition-strategies>
    <reactive-integration-techniques>
      <computed-store-derivation>
        Computed stores derive complex state from multiple source stores through reactive computation that automatically updates when dependencies change. Derivation techniques create read-only stores that aggregate, filter, or transform data from source stores while maintaining full reactivity. These patterns enable sophisticated data processing pipelines that respond automatically to source changes without manual coordination.
      </computed-store-derivation>
      <effect-based-store-coordination>
        Effect-based coordination synchronizes store state with external systems, other stores, or persistent storage through reactive effects that respond to store changes. Coordination effects handle side effects like API calls, localStorage updates, and inter-store synchronization while maintaining reactive consistency. The patterns enable stores to participate in larger reactive systems while preserving store-centric state management.
      </effect-based-store-coordination>
      <store-middleware-patterns>
        Middleware patterns extend store functionality through interception of update operations, enabling features like logging, validation, persistence, and change history. Middleware integration maintains store interface compatibility while adding cross-cutting concerns through composition rather than inheritance. The patterns support both synchronous and asynchronous middleware while preserving store performance and reactivity characteristics.
      </store-middleware-patterns>
    </reactive-integration-techniques>
    <advanced-type-patterns>
      <conditional-store-typing>
        Advanced TypeScript patterns use conditional types to create stores with dynamic property types based on configuration or context. Conditional typing enables creation of flexible store interfaces that adapt to usage patterns while maintaining type safety. The patterns support generic store factories, configuration-dependent typing, and runtime type adaptation without sacrificing compile-time verification.
      </conditional-store-typing>
      <store-interface-projection>
        Interface projection creates type-safe views of stores that expose only relevant properties for specific use cases while maintaining full store functionality. Projection patterns enable creation of focused interfaces for different application layers without duplicating store logic. The projections maintain reactivity and update capabilities while providing clean separation of concerns through type system constraints.
      </store-interface-projection>
      <polymorphic-store-handling>
        Polymorphic patterns handle stores with varying structures through union types, discriminated unions, and generic constraints that preserve type safety across different store configurations. Polymorphic handling enables creation of flexible APIs that work with different store types while maintaining full TypeScript inference. The patterns support runtime type guards, generic constraints, and type narrowing for safe polymorphic store manipulation.
      </polymorphic-store-handling>
    </advanced-type-patterns>
  </advanced-patterns>
</technical-internals>