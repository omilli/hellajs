<technical-internals>
  <core-architecture>
    <standalone-css-system>
      <css-object-architecture>
        The CSS system is a standalone, framework-agnostic implementation built around JavaScript object representations of CSS rules with automatic class generation and rule management. CSS objects support nested selectors, pseudo-classes, media queries, and arbitrary CSS properties using TypeScript definitions from csstype. The system processes objects at runtime with intelligent caching and memoization to maintain performance.
      </css-object-architecture>
      <css-generation-pipeline>
        The CSS generation system accepts CSS objects and options, generating unique class names and CSS rules. The processing system recursively transforms nested objects into valid CSS strings, handling nested selectors with & symbol substitution, kebab-case property conversion, and array value joining. Generated CSS is injected into a dedicated DOM style element with id 'hella-css'.
      </css-generation-pipeline>
      <non-reactive-architecture>
        The CSS system operates independently without reactive bindings or signal dependencies. CSS generation is purely functional, accepting static objects and producing deterministic class names and CSS rules. Dynamic styling can be achieved through conditional object composition at the application level rather than built-in reactivity.
      </non-reactive-architecture>
    </standalone-css-system>
    <rule-management-engine>
      <reference-counting-system>
        CSS rules use reference counting to track usage and enable cleanup through CSS removal system. Each generated rule maintains a reference count that increments when CSS generation is invoked and decrements when CSS removal system is executed with the returned class name. Rules with zero references are removed from the DOM style element, preventing stylesheet accumulation.
      </reference-counting-system>
      <rule-deduplication>
        Identical CSS objects generate the same rules through deterministic object hashing using the stringification system. The system maintains a global rule registry registry that maps rule keys to CSS content strings. Hash-based deduplication prevents duplicate rule insertion while reference counting tracks shared usage across multiple CSS generation calls.
      </rule-deduplication>
      <selector-generation-patterns>
        Class names use auto-incrementing base36 counters (c1, c2, c3...) or custom names via the name option. The scoped option creates nested selectors (.scope .className) for component isolation. Global styles bypass class generation entirely, injecting rules directly without selectors. All CSS is injected into a single 'hella-css' style element.
      </selector-generation-patterns>
    </rule-management-engine>
    <variable-system>
      <nested-object-flattening>
        The CSS variable system processes nested JavaScript objects into flat CSS custom property declarations using the flattening system. Nested structures like { colors: { primary: '#blue' } } become --colors-primary CSS variables with dot-to-dash conversion. The flattening algorithm recursively traverses object properties while maintaining proper CSS variable naming conventions.
      </nested-object-flattening>
      <variable-access-reconstruction>
        Flattened variables are reconstructed into nested access objects that mirror the original structure while containing var() function calls. The reconstruction algorithm rebuilds the original object hierarchy, substituting leaf values with CSS custom property references. This enables JavaScript-style property access (theme.colors.primary) that evaluates to var(--colors-primary).
      </variable-access-reconstruction>
      <variable-scope-management>
        CSS variables are applied to the :root element through a dedicated 'hella-vars' style element. The variable system operates independently with its own variable registry and caching mechanisms. Variables persist until explicitly cleared via variable reset system, enabling persistent theming across component lifecycles without reactive dependencies.
      </variable-scope-management>
    </variable-system>
  </core-architecture>
  <memory-management>
    <caching-strategies>
      <dual-cache-system>
        The CSS system employs two primary caches: inline caching system for CSS generation system result memoization and variable caching system object processing. The inline caching system uses composite hash keys including object content, scoped parameter, name parameter, and global flag. The variables cache stores both flattened CSS properties and reconstructed access objects for efficient reuse.
      </dual-cache-system>
      <deterministic-hashing>
        The stringification system creates deterministic hash keys by recursively processing objects with sorted property keys. Object traversal maintains consistent key ordering regardless of property insertion order, enabling reliable cache hits. Hash generation accounts for nested structures and primitive values while maintaining fast O(1) cache lookups.
      </deterministic-hashing>
      <simple-cache-management>
        The variable cache implements simple size-based eviction, clearing the entire cache when it exceeds 100 entries. This approach prioritizes simplicity over sophisticated LRU algorithms while preventing unbounded memory growth. The inline caching system operates without size limits, relying on application lifecycle for natural cleanup.
      </simple-cache-management>
    </caching-strategies>
    <rule-lifecycle-management>
      <manual-cleanup-system>
        Rule removal requires explicit CSS removal system calls with the class name returned from CSS generation. Reference counting decrements on removal, and rules with zero references are removed from the DOM style element. Manual cleanup provides deterministic resource management without automatic lifecycle assumptions.
      </manual-cleanup-system>
      <immediate-dom-updates>
        Style updates are applied immediately to the DOM without batching mechanisms. The rule update system updates the rule registry and immediately regenerates the style element content. This direct approach ensures immediate visual feedback while maintaining simplicity over batching optimizations.
      </immediate-dom-updates>
      <single-element-injection>
        All CSS content is injected into a single 'hella-css' style element created by the style element management. The style element's textContent is regenerated from the complete rule registry whenever rules change. This approach centralizes CSS management while simplifying DOM manipulation to a single element update.
      </single-element-injection>
    </rule-lifecycle-management>
  </memory-management>
  <rendering-algorithms>
    <css-object-processing>
      <nested-selector-resolution>
        The processing system recursively processes nested CSS objects, distinguishing between CSS properties and nested selectors. & symbol substitution replaces & with the parent selector for pseudo-classes and state selectors. At-rules (@media, @keyframes) and nested selectors create hierarchical CSS structures while maintaining proper CSS syntax and specificity.
      </nested-selector-resolution>
      <property-value-transformation>
        CSS property names undergo camelCase to kebab-case conversion using regex replacement. Array values are joined with comma-space separation for multi-value properties. String and number values are passed through as-is, maintaining CSS validity while supporting JavaScript-native value representations without unit inference.
      </property-value-transformation>
      <minimal-processing-approach>
        The system avoids vendor prefix automation and unit inference, relying on explicit CSS values provided in the object. Property processing focuses on syntax transformation (camelCase conversion) and value serialization (array joining) while preserving developer-specified values without additional preprocessing.
      </minimal-processing-approach>
    </css-object-processing>
    <immediate-computation>
      <eager-css-generation>
        CSS content generation occurs immediately when CSS generation is invoked, processing the CSS object through the processing system and updating the DOM style element synchronously. No lazy evaluation or deferred processing is implemented, ensuring immediate availability of generated styles for rendering.
      </eager-css-generation>
      <rule-level-deduplication>
        Generated CSS rules undergo deduplication at the rule level through the rule registry storage system. Identical CSS objects produce identical rule keys, preventing duplicate CSS generation while maintaining separate reference counts. Deduplication operates on stringified object content rather than generated CSS strings.
      </rule-level-deduplication>
      <synchronous-dom-injection>
        CSS generation and DOM injection occur synchronously within the CSS generation system call. The rule update system immediately updates the style element content from the complete rule map. This approach ensures consistent styling without asynchronous timing issues or coordination requirements.
      </synchronous-dom-injection>
    </immediate-computation>
  </rendering-algorithms>
  <performance-optimizations>
    <string-based-optimization>
      <deterministic-stringification>
        Object stringification uses a deterministic algorithm through the stringification system, sorting object keys before serialization. The recursive algorithm handles nested objects and primitive values consistently, creating identical strings for structurally equivalent objects regardless of property insertion order.
      </deterministic-stringification>
      <composite-key-generation>
        Cache keys combine stringified object content with configuration options (scoped, name, global flags) to ensure proper cache separation. The inline caching system uses composite keys like 'inline:{object}:{scoped}:{name}:{global}' to prevent cache pollution when identical objects are used with different options.
      </composite-key-generation>
      <simple-collision-handling>
        The system relies on JavaScript Map key equality for collision handling, using string keys without additional collision detection. Map-based storage provides O(1) average case performance while maintaining simplicity over complex collision resolution algorithms.
      </simple-collision-handling>
    </string-based-optimization>
    <immediate-dom-updates>
      <synchronous-style-updates>
        CSS rule changes trigger immediate DOM updates without batching mechanisms. The rule update system updates the rule registry and immediately regenerates the complete style element content. Synchronous updates ensure immediate visual feedback while maintaining implementation simplicity.
      </synchronous-style-updates>
      <full-content-regeneration>
        Style element content is fully regenerated from the complete rule registry on every rule change. The system joins all rule values into a single CSS string for textContent assignment. Full regeneration avoids complex diffing algorithms while ensuring consistent style element state.
      </full-content-regeneration>
      <standalone-update-system>
        DOM updates operate independently without integration with external batching or reactive systems. Style changes are self-contained within the CSS system, enabling framework-agnostic usage without coordination requirements or timing dependencies.
      </standalone-update-system>
    </immediate-dom-updates>
    <memory-efficiency-patterns>
      <simple-reference-counting>
        Reference counting uses Map-based storage with integer increment/decrement operations. The refCounts map tracks usage per rule key, enabling efficient lookup and modification. Manual cleanup through CSS removal system provides deterministic memory management without automatic lifecycle assumptions or optimization complexity.
      </simple-reference-counting>
      <size-based-cache-eviction>
        The variable cache implements simple size-based eviction, clearing the entire cache when it exceeds 100 entries. This approach prioritizes implementation simplicity over sophisticated eviction algorithms while preventing unbounded memory growth during long-running applications.
      </size-based-cache-eviction>
      <minimal-allocation-patterns>
        Object processing uses while loops and direct property access to minimize temporary object allocation. The stringification system builds result strings through array accumulation and joining. Memory efficiency focuses on algorithmic simplicity rather than complex pooling or reuse patterns.
      </minimal-allocation-patterns>
    </memory-efficiency-patterns>
  </performance-optimizations>
  <advanced-algorithms>
    <css-variable-flattening>
      <iterative-object-traversal>
        Variable flattening uses the flattening system to iteratively process nested objects into dot-notation keys. The algorithm traverses object properties recursively, building property paths and storing primitive values in a flat result object. Key construction maintains hierarchical relationships through dot separation.
      </iterative-object-traversal>
      <dot-to-dash-conversion>
        Flattened variable names undergo dot-to-dash conversion when generating CSS custom property references. The CSS variable system creates var() calls with --prefix and kebab-case naming (colors.primary becomes var(--colors-primary)). Conversion maintains CSS identifier validity while preserving semantic meaning.
      </dot-to-dash-conversion>
      <nested-object-reconstruction>
        Variable reconstruction iterates through flattened keys, splitting dot-notation paths to rebuild nested object structures. The algorithm creates intermediate objects as needed and assigns var() function calls as leaf values. Reconstruction enables JavaScript-style property access while referencing CSS custom properties.
      </nested-object-reconstruction>
    </css-variable-flattening>
    <rule-deduplication-engine>
      <object-based-deduplication>
        Rule deduplication operates on stringified input objects combined with selector and global flag information. The stringification system creates consistent keys for identical CSS objects, enabling Map-based deduplication in rule registry. Object-based comparison ensures identical inputs produce shared CSS rules regardless of call context.
      </object-based-deduplication>
      <key-based-rule-storage>
        Rules are stored using composite keys that include object content, selector, and global flag. The rule registry uses these keys to prevent duplicate CSS generation while maintaining separate reference counts. Key-based storage enables efficient rule lookup and content sharing across multiple CSS generation calls.
      </key-based-rule-storage>
      <no-rule-merging>
        The system does not implement rule merging or selector combination optimizations. Each CSS generation call with unique parameters generates separate rules, maintaining clear correspondence between function calls and generated CSS. This approach prioritizes predictability over stylesheet size optimization.
      </no-rule-merging>
    </rule-deduplication-engine>
    <static-style-computation>
      <non-reactive-processing>
        CSS processing operates on static objects without dependency tracking or reactive integration. The CSS generation system accepts plain JavaScript objects and produces deterministic class names and CSS rules. Dynamic styling requires explicit re-calling of CSS generation with updated objects rather than automatic invalidation.
      </non-reactive-processing>
      <manual-style-updates>
        Style updates occur through explicit CSS generation calls with new object parameters. Applications must manage their own state changes and call CSS generation when styling needs to update. Manual update patterns enable integration with any state management approach without framework-specific reactive assumptions.
      </manual-style-updates>
      <framework-agnostic-lifecycle>
        Style lifecycle management operates independently of component frameworks through manual CSS removal system calls. Resource cleanup depends on application-managed lifecycles rather than automatic effect coordination. This approach enables usage across different frameworks and vanilla JavaScript applications.
      </framework-agnostic-lifecycle>
    </static-style-computation>
  </advanced-algorithms>
  <integration-patterns>
    <component-styling-patterns>
      <manual-scoping-patterns>
        Component-specific styles use the scoped option to generate nested selectors (.scope .className) for style isolation. Scoping requires explicit scope class application to parent elements. Manual scoping enables encapsulation while requiring deliberate integration with component rendering systems.
      </manual-scoping-patterns>
      <object-composition-strategies>
        Multiple CSS objects are composed through JavaScript object merging before passing to CSS generation. Class names from multiple CSS generation calls can be concatenated for combined styling. Composition occurs at the application level through standard JavaScript object operations rather than built-in composition APIs.
      </object-composition-strategies>
      <explicit-lifecycle-management>
        Component lifecycle integration requires explicit CSS removal system calls during component unmounting or cleanup. Applications must manage style lifecycle through component framework hooks or cleanup callbacks. Explicit management enables integration with any component system without framework-specific assumptions.
      </explicit-lifecycle-management>
    </component-styling-patterns>
    <theme-system-integration>
      <static-theming-support>
        CSS variables enable theming through the CSS variable system that generates CSS custom properties on :root. Theme objects are processed once and persist until variable reset system is called. Static theming supports theme definition at application startup without runtime theme switching mechanisms.
      </static-theming-support>
      <css-variable-inheritance>
        Theme variables follow standard CSS custom property inheritance and cascade rules. Variables defined on :root are available throughout the document hierarchy. JavaScript access objects created by the variable system provide var() references that leverage CSS inheritance without additional fallback mechanisms.
      </css-variable-inheritance>
      <manual-responsive-patterns>
        Responsive theming requires explicit media query definitions within CSS objects passed to CSS generation. The system does not provide responsive theme utilities, relying on standard CSS media queries and conditional object composition. Responsive behavior is achieved through application-level state management and conditional styling.
      </manual-responsive-patterns>
    </theme-system-integration>
    <framework-agnostic-coordination>
      <static-value-styling>
        CSS properties accept static values including strings, numbers, and arrays without reactive binding capabilities. Dynamic styling requires explicit CSS generation re-calls with updated objects when application state changes. Static value processing enables predictable behavior across different JavaScript environments.
      </static-value-styling>
      <manual-state-integration>
        Style updates based on application state require manual coordination through conditional object composition and CSS generation re-calls. Applications manage their own state changes and determine when styling needs updates. Manual integration enables compatibility with any state management approach or framework.
      </manual-state-integration>
      <independent-lifecycle-management>
        Style lifecycle operates independently without effect system integration or automatic coordination. Cleanup and initialization are managed through explicit CSS removal system calls and component lifecycle hooks. Independent operation enables usage in diverse JavaScript environments without framework dependencies.
      </independent-lifecycle-management>
    </framework-agnostic-coordination>
  </integration-patterns>
  <edge-case-handling>
    <minimal-validation-approach>
      <pass-through-values>
        CSS property values are passed through without validation, relying on developer-provided valid CSS values. The system converts camelCase to kebab-case and joins array values but does not validate CSS syntax or browser compatibility. Pass-through processing maintains simplicity while requiring developer CSS knowledge.
      </pass-through-values>
      <basic-selector-generation>
        Generated selectors use simple class names and scoping patterns without special character escaping or syntax verification. Selector generation focuses on predictable patterns (c1, c2, .scope .class) that avoid complex CSS syntax edge cases. Basic generation prioritizes reliability over advanced selector features.
      </basic-selector-generation>
      <no-browser-specific-handling>
        The system does not include vendor prefix automation, polyfills, or browser compatibility layers. Cross-browser support depends on developer-provided CSS properties and values that work across target browsers. Minimal browser handling reduces complexity while requiring explicit compatibility management.
      </no-browser-specific-handling>
    </minimal-validation-approach>
    <memory-pressure-handling>
      <simple-cache-clearing>
        The variable cache implements simple overflow management by clearing the entire cache when it exceeds 100 entries. Cache clearing prevents unbounded memory growth through complete eviction rather than selective removal. Simple clearing prioritizes implementation simplicity over cache effectiveness optimization.
      </simple-cache-clearing>
      <standard-reference-counting>
        Reference counting uses standard JavaScript number types without overflow detection or special handling. The system assumes normal usage patterns that do not exceed JavaScript's number precision limits. Standard counting relies on manual cleanup through CSS removal system for memory management.
      </standard-reference-counting>
      <basic-memory-management>
        Memory management relies on standard JavaScript garbage collection without special coordination or optimization. Cleanup occurs through map deletion and DOM element content updates when rules are removed. Basic management approach avoids complex memory optimization while providing predictable resource lifecycle.
      </basic-memory-management>
    </memory-pressure-handling>
    <single-threaded-patterns>
      <synchronous-operation-model>
        CSS generation operates synchronously within single-threaded JavaScript environments without thread safety considerations. All operations complete within the calling thread, avoiding concurrency issues through sequential execution. Synchronous operation ensures predictable behavior in standard browser and Node.js environments.
      </synchronous-operation-model>
      <immediate-dom-updates>
        Style updates occur immediately and synchronously, avoiding race conditions through sequential processing. DOM modifications are atomic at the style element level, ensuring consistent stylesheet state. Immediate updates eliminate timing issues while requiring careful coordination in complex applications.
      </immediate-dom-updates>
      <synchronous-resource-loading>
        Style resources are applied immediately when CSS generation or variable systems are called, without asynchronous loading patterns. All CSS generation and DOM injection completes synchronously within the function call. Synchronous loading ensures immediate style availability without flash of unstyled content considerations.
      </synchronous-resource-loading>
    </single-threaded-patterns>
  </edge-case-handling>
</technical-internals>