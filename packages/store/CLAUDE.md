<technical-internals>
  <store-architecture>
    <simple-reactive-proxy>
      <property-transformation>
        The store factory transforms plain JavaScript objects into reactive structures through immediate property analysis during creation. Each property undergoes type-based conversion: primitives and arrays become reactive signals, nested plain objects become nested store instances, and functions remain unchanged. The transformation occurs once during store creation in a single pass through Object.entries(initial).
      </property-transformation>
      <direct-property-delegation>
        Store instances are simple objects with properties that directly reference signals or nested stores. Property access delegates directly to underlying signals without proxy interception - the "proxy" is conceptual, implemented through direct property assignment via Object.defineProperty during initialization.
      </direct-property-delegation>
      <immediate-nested-creation>
        Nested objects are converted to stores immediately during parent store creation. There is no lazy initialization - all nested structures are created upfront when the parent store is instantiated.
      </immediate-nested-creation>
    </simple-reactive-proxy>
    <type-system-integration>
      <conditional-type-mapping>
        The store type system uses TypeScript conditional types to transform object properties: functions remain as-is, arrays and primitives become Signal<T> or ReadonlySignal<T> based on readonly configuration, and nested objects become Store<T> instances. This transformation provides type safety for reactive access patterns.
      </conditional-type-mapping>
      <readonly-type-enforcement>
        Readonly functionality uses TypeScript conditional types to prevent mutations at compile-time. At runtime, readonly properties are implemented as computed signals (which have no setter function) rather than writable signals. No runtime errors are thrown - readonly properties simply don't expose setter capabilities.
      </readonly-type-enforcement>
      <partial-deep-updates>
        The PartialDeep utility type enables type-safe partial updates by recursively making all properties optional while preserving nested structure. This supports the update() method's partial object merging.
      </partial-deep-updates>
    </type-system-integration>
    <signal-integration>
      <direct-signal-delegation>
        Store properties are direct references to signals created during initialization. Property access and updates delegate directly to signal methods without additional abstraction layers.
      </direct-signal-delegation>
      <snapshot-computed-signal>
        Each store exposes a computed signal (both `snapshot` and deprecated `computed`) that provides reactive snapshots of the entire store state. This computed signal tracks access to individual store properties and returns a plain object representation.
      </snapshot-computed-signal>
    </signal-integration>
  </store-architecture>
  <update-mechanisms>
    <direct-property-updates>
      <individual-property-mutation>
        Store properties support direct mutation through signal setter syntax (e.g., `store.prop(newValue)`). These updates delegate directly to underlying signal setters with no store-level interception or validation.
      </individual-property-mutation>
      <nested-property-delegation>
        Nested store properties are independent store instances. Updates to nested properties delegate to the child store's update mechanisms without parent involvement.
      </nested-property-delegation>
    </direct-property-updates>
    <bulk-update-operations>
      <set-method-implementation>
        The set method iterates through all original property keys and applies new values to corresponding store properties. Only properties that exist in both the original store AND the new value are updated. Missing properties in the new value are silently skipped.
      </set-method-implementation>
      <update-method-implementation>
        The update method performs shallow merging by iterating through the partial object's entries. For nested objects, it delegates to the child store's update method. For primitives, it calls applyUpdate which delegates to the signal setter.
      </update-method-implementation>
      <apply-update-helper>
        The applyUpdate helper function handles the actual value application: if the target is a function (signal), it calls target(value). If the target is an object with an update method, it calls target.update(value). This is the core update delegation mechanism.
      </apply-update-helper>
    </bulk-update-operations>
  </update-mechanisms>
  <memory-management>
    <simple-cleanup-system>
      <recursive-cleanup-traversal>
        Store cleanup implements simple recursive traversal through store properties. The cleanup method iterates through all properties, calling cleanup() on any property that has a cleanup method, or recursively traversing nested objects.
      </recursive-cleanup-traversal>
      <no-safety-mechanisms>
        The cleanup implementation is straightforward with no concurrency handling, error recovery, or safety mechanisms. It's a simple recursive traversal that assumes cleanup operations succeed.
      </no-safety-mechanisms>
    </simple-cleanup-system>
    <immediate-resource-creation>
      <no-lazy-initialization>
        All signals and nested stores are created immediately during store initialization. There is no lazy creation, caching, or optimization - each property gets its own signal instance created upfront.
      </no-lazy-initialization>
      <no-reuse-patterns>
        Every store property creates a new signal instance. There are no reuse patterns, caching, or optimization strategies for similar property configurations.
      </no-reuse-patterns>
    </immediate-resource-creation>
  </memory-management>
  <readonly-system>
    <simple-readonly-implementation>
      <computed-signal-approach>
        Readonly properties are implemented using computed signals instead of writable signals. The readonly configuration is checked during store creation, and readonly properties get computed(() => signal()) instead of the direct signal reference.
      </computed-signal-approach>
      <no-runtime-validation>
        There is no runtime validation or error throwing for readonly violations. Readonly properties simply don't have setter functions - they are computed signals that only expose getter functionality.
      </no-runtime-validation>
      <configuration-processing>
        Readonly configuration is processed during store initialization. The system checks if readonly is true (all properties) or an array (specific properties) and creates appropriate signal types accordingly.
      </configuration-processing>
    </simple-readonly-implementation>
  </readonly-system>
  <performance-characteristics>
    <minimal-overhead>
      <direct-delegation>
        Store property access has minimal overhead since properties are direct references to signals. No proxy interception or complex delegation chains exist.
      </direct-delegation>
      <no-optimizations>
        The implementation includes no performance optimizations, caching, or complex execution path analysis. Updates are simple iterations through object properties.
      </no-optimizations>
      <linear-scaling>
        Store operations scale linearly with the number of properties being processed. Nested updates add depth-based complexity but with simple recursive delegation.
      </linear-scaling>
    </minimal-overhead>
  </performance-characteristics>
</technical-internals>