---
applyTo: "packages/dom/**"
---

<dom-package-instructions>
  <overview>
    Surgical DOM updates without virtual DOM diffing. Only elements with reactive dependencies update, not entire trees. Features automatic cleanup via MutationObserver (auto-disposes effects/events on node removal), global event delegation (single listener per type on document.body in capture phase), keyed list reconciliation using LIS algorithm for minimal moves, reactive DOM references with auto-watching, and async component loading with error boundaries.
  </overview>
  <mental-model>
    <concept>Surgical updates - only reactive elements update, not entire trees</concept>
    <cleanup>MutationObserver auto-disposes effects and events on node removal with deferred processing</cleanup>
    <events>Global delegation via single listener per type (capture phase) using composedPath() traversal</events>
    <lists>Keyed reconciliation using LIS algorithm with multiple fast paths and collection reuse</lists>
    <portals>Render children to different DOM locations with content cleanup on updates</portals>
    <elements>Custom elements with light DOM, reactive props, and captured slots</elements>
    <lazy-loading>Async component loading with optional loading state, automatic error fallback, and boundary markers</lazy-loading>
    <references>Reactive DOM references with auto-watching and method chaining</references>
    <error-boundaries>Global onError handler with element error: prefix for fallback/category config, boundary caching, reset capability; fallback UI only rendered for bind/event/reactive-child errors</error-boundaries>
  </mental-model>
  <architecture>
    <data-structures>
      <structure name="HellaElement">
        <extends>Element</extends>
        <field name="__hella_effects">Array of effect disposer functions</field>
        <field name="__hella_handlers">Record of event handlers by event type</field>
        <field name="__hella_mounted">Boolean flag indicating mount state</field>
        <field name="__hella_hooks">Stackable lifecycle hooks (arrays per hook type)</field>
        <field name="__hella_component_scope">Component scope disposer function</field>
        <field name="__hella_portal_cleanup">Portal cleanup function</field>
        <field name="__hella_error_config">ErrorConfig object (fallback, category, boundary)</field>
        <field name="__hella_cached_boundary">Cached boundary element reference for performance</field>
        <field name="__hella_original_node">Original HellaNode for reset functionality</field>
      </structure>
      <structure name="HellaNode">
        <field name="tag">Element tag name or "$" for fragment</field>
        <field name="props">Static attributes object</field>
        <field name="on">Event handlers object (on: prefix)</field>
        <field name="bind">Reactive bindings object (bind: prefix)</field>
        <field name="hooks">Lifecycle hooks object (hook: prefix)</field>
        <field name="error">Error configuration object (error: prefix)</field>
        <field name="children">Array of HellaChild elements</field>
        <field name="__scope">Component scope disposer (attached by component())</field>
      </structure>
      <structure name="ForEach internals">
        <field name="keyToNode">Map from key to DOM Node</field>
        <field name="keyToItem">Map from key to item reference</field>
        <field name="currentKeys">Array preserving key order for diffing</field>
        <field name="startMarker">Comment node marking list start ("forEach")</field>
        <field name="endMarker">Comment node marking list end ("forEach")</field>
        <field name="newKeys">Reusable array for new keys (cleared each render)</field>
        <field name="newKeyToNode">Reusable Map for new node mappings (cleared each render)</field>
        <field name="newKeyToItem">Reusable Map for new item mappings (cleared each render)</field>
        <field name="nodesToRemove">Reusable array for bulk removal operations</field>
        <optimization>Collections swapped (not reallocated) after render - temp collections reused</optimization>
      </structure>
      <structure name="Portal internals">
        <field name="marker">Single comment node ("portal") for cleanup tracking</field>
        <field name="portalNodes">Array tracking current portal content for cleanup</field>
        <field name="to">CSS selector for target element</field>
        <field name="type">Insert type: append (default), prepend, replace, before, after</field>
        <optimization>Previous content cleaned on each reactive update</optimization>
      </structure>
      <structure name="Lazy internals">
        <field name="start">Comment node ("lazy-start") marking boundary start</field>
        <field name="end">Comment node ("lazy-end") marking boundary end</field>
        <field name="loader">Async function returning Promise&lt;Component|HellaNode&gt;</field>
        <field name="loading">Optional content shown while loading</field>
        <field name="fallback">Optional content shown on loader error</field>
        <field name="props">Props passed to loaded component</field>
        <optimization>Loading state shown while async load is pending, replaced on success or error</optimization>
      </structure>
      <structure name="$ref internals">
        <field name="targetNode">Currently selected DOM element or null</field>
        <field name="wrapper">Reactive wrapper when element exists</field>
        <field name="queuedOps">Array of operations pending element appearance</field>
        <field name="isWatching">Boolean flag for mutation watching state</field>
        <optimization>Auto-watches for element via MutationObserver when not found</optimization>
      </structure>
      <structure name="$collection internals">
        <field name="elementWrappers">Array of DomWrapper instances for found elements</field>
        <field name="queuedOps">Array of operations applied to new elements automatically</field>
        <field name="selector">CSS selector string for element collection</field>
        <field name="processNewNodes">Function handling new element discovery and operation application</field>
        <optimization>Uses global multiSelectors Map with WeakSet for deduplication</optimization>
      </structure>
      <structure name="html template internals">
        <field name="templateCache">WeakMap from TemplateStringsArray to HtmlInternalNode</field>
        <marker name="HtmlPlaceholder">{ __placeholder: index }</marker>
        <marker name="HtmlDynamicComponent">{ __dynamicComponent: index, props, children }</marker>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="html-parsing">
        <purpose>Parse HTML string to HellaNode AST with placeholder markers</purpose>
        <tokenization>Single regex TOKEN_REGEX matches closing tags, opening/self-closing tags, attributes, text</tokenization>
        <attribute-parsing>ATTR_REGEX categorizes by prefix: error:, on:, bind:, hook:, e:, or props using char code optimization</attribute-parsing>
        <optimization>First char code check (h=104, b=98, o=111) for prefix detection in ATTR_REGEX</optimization>
        <stack-based>Stack tracks nesting depth, builds tree bottom-up with unclosed tag handling</stack-based>
        <placeholders>__SLOT_N__ markers remain in AST for value substitution (not __HELLA_N__)</placeholders>
        <dynamic-tags>&lt;${Component}&gt; becomes HtmlDynamicComponent with placeholder index and merged props</dynamic-tags>
        <root-interpolation>Root-level html`${value}` returns value directly unwrapped</root-interpolation>
        <fragment-wrapping>Multiple root elements wrapped in { tag: "$", children: [...] }</fragment-wrapping>
        <result>HellaNode tree with HtmlPlaceholder and HtmlDynamicComponent objects</result>
      </algorithm>
      <algorithm name="value-substitution">
        <purpose>Clone cached AST and substitute interpolated values</purpose>
        <cloning>Deep clone AST to avoid mutating cache (only mutable parts)</cloning>
        <placeholder-replacement>HtmlPlaceholder replaced with actual values from array</placeholder-replacement>
        <component-resolution>HtmlDynamicComponent resolves to component(fn, props) call</component-resolution>
        <passthrough>ForEach/Portal bypass component() wrapper, called directly</passthrough>
        <children-handling>Single child unwrapped, multiple wrapped in array</children-handling>
        <flattening>Children flattened via .flat() to prevent nested arrays</flattening>
      </algorithm>
      <algorithm name="foreach-reconciliation">
        <fast-path name="first-render">currentKeys empty - build in fragment, single insert</fast-path>
        <fast-path name="complete-replacement">No key overlap - bulk remove/insert via fragment</fast-path>
        <fast-path name="empty-list">Clear content between markers</fast-path>
        <complex-path>LIS algorithm for minimal moves when keys overlap</complex-path>
        <lis-purpose>Find longest increasing subsequence of stable elements</lis-purpose>
        <lis-implementation>Binary search for O(n log n), move only non-LIS elements</lis-implementation>
        <key-resolution>element.props.key → item.id → array index (priority order)</key-resolution>
        <reference-equality>Item reference !== triggers re-resolution even if key matches</reference-equality>
        <memory-optimization>Collections swapped (not reallocated) after render, temp collections reused</memory-optimization>
        <node-reuse>Same item reference reuses existing DOM node, new reference creates new node</node-reuse>
        <bulk-operations>Collect removals before DOM operations for better performance</bulk-operations>
      </algorithm>
      <algorithm name="event-delegation">
        <purpose>Single listener per event type for efficient event handling</purpose>
        <registration>document.body.addEventListener(type, handler, true) in capture phase</registration>
        <path-traversal>composedPath() provides pre-computed ancestor chain for faster traversal</path-traversal>
        <fast-exit>handlerCounts.has(type) check skips if no handlers registered</fast-exit>
        <handler-lookup>Walk composedPath, check __hella_handlers[type] on each element</handler-lookup>
        <invocation>handler.call(element, event) maintains correct context</invocation>
        <no-stop>Traverses entire path by default (no automatic stopPropagation)</no-stop>
        <handler-counting>Global handlerCounts Map tracks active handlers per event type</handler-counting>
      </algorithm>
      <algorithm name="cleanup-system">
        <purpose>Auto-dispose effects and handlers when nodes removed from DOM</purpose>
        <observer>MutationObserver watches removedNodes, queues in Set</observer>
        <deferred>setTimeout defers processing (non-blocking)</deferred>
        <connection-check>isConnected and parentNode checks skip moved nodes</connection-check>
        <hooks>Runs beforeDestroy before cleanup, afterDestroy after</hooks>
        <iteration>Recursive disposal using iterative stack (not recursion)</iteration>
        <component-scope>Calls __hella_component_scope() during cleanup</component-scope>
        <portal-cleanup>Calls __hella_portal_cleanup() during marker cleanup</portal-cleanup>
      </algorithm>
      <algorithm name="mount-system">
        <purpose>Track mounted state and run afterMount hooks</purpose>
        <observer>MutationObserver detects addedNodes, queues for mount</observer>
        <deferred>setTimeout defers mount queue processing</deferred>
        <connection-check>isConnected check skips nodes removed before flush</connection-check>
        <flag-setting>Sets __hella_mounted = true recursively</flag-setting>
        <hooks>Runs afterMount hooks after setting flag</hooks>
        <iteration>Iterative stack-based traversal for all descendants</iteration>
      </algorithm>
      <algorithm name="lazy-component-loading">
        <purpose>Load and render async components with error boundaries</purpose>
        <boundary-markers>Creates "lazy-start" and "lazy-end" comment markers</boundary-markers>
        <async-loading>calls props.loader() Promise, handles both success and error</async-loading>
        <loading-path>Renders optional props.loading between markers while awaiting the Promise</loading-path>
        <success-path>Resolves component (function or HellaNode) and mounts between markers, replaces loading state</success-path>
        <error-path>On loader error, renders optional props.fallback between markers, replaces loading state</error-path>
        <cleanup>Marker removal triggers cleanup via MutationObserver</cleanup>
      </algorithm>
      <algorithm name="portal-rendering">
        <purpose>Render children to different DOM locations while maintaining reactivity</purpose>
        <marker>Creates single "portal" comment marker for tracking</marker>
        <reactive-updates>On each update, cleans previous content and re-renders all children</reactive-updates>
        <target-resolution>document.querySelector(to) finds target element on each render</target-resolution>
        <insert-methods>Supports append (default), prepend, replace, before, after</insert-methods>
        <cleanup-tracking>portalNodes array tracks all rendered nodes for removal</cleanup-tracking>
        <fragment-rendering>Children rendered in DocumentFragment before insertion</fragment-rendering>
      </algorithm>
      <algorithm name="dom-reference-system">
        <purpose>Reactive DOM element manipulation with auto-watching</purpose>
        <ref-single>$ref creates single element reference with queued operations</ref-single>
        <ref-collection>$collection creates multi-element reference with continuous watching</ref-collection>
        <auto-watching>Uses multiSelectors Map with WeakSet for deduplication</auto-watching>
        <mutation-callbacks>MutationObserver triggers scheduleMultiCheck for new elements</mutation-callbacks>
        <operation-queuing>Operations queued when element not found, applied when discovered</operation-queuing>
        <reactive-wrapper>reactive() function creates DomWrapper with bind/on/hooks methods</reactive-wrapper>
      </algorithm>
      <algorithm name="error-boundary-system">
        <purpose>Hybrid global/element error handling with fallback rendering</purpose>
        <global-handler>Set via onError(), supports multiple handlers via Set, first non-null result wins</global-handler>
        <element-config>error:fallback, error:category, error:boundary attributes on elements</element-config>
        <boundary-lookup>findBoundary() walks DOM tree via parentElement, caches result in __hella_cached_boundary</boundary-lookup>
        <config-resolution>resolveErrorConfig() walks up for any error config (including category-only)</config-resolution>
        <error-sources>Reactive children (fallback rendered), bind: callbacks (fallback rendered), on:/e: handlers (fallback rendered), beforeMount hook (no fallback)</error-sources>
        <fallback-rendering>Handler returns HellaNode → replaceChildren on boundary element (only for bind, event, reactive child errors)</fallback-rendering>
        <reset-functionality>reset() re-renders __hella_original_node when available</reset-functionality>
        <infinite-loop-prevention>WeakSet handlingBoundaries tracks active boundaries to prevent re-entry</infinite-loop-prevention>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="while-loops">While loops with cached length for hot paths</optimization>
    <optimization name="fragment-batching">DocumentFragment for bulk DOM inserts</optimization>
    <optimization name="map-swapping">Swap Map references instead of recreation</optimization>
    <optimization name="early-exits">Fast paths for common scenarios (first render, empty, complete replace)</optimization>
    <optimization name="array-join">Array.join for string building instead of +=</optimization>
    <optimization name="direct-property-checks">Object.hasOwn() for type guards</optimization>
    <optimization name="char-code-checks">First char code for attribute prefix detection in ATTR_REGEX</optimization>
    <optimization name="handler-count">Fast exit in delegation if no handlers for event type</optimization>
    <optimization name="collection-reuse">ForEach swaps collections instead of recreating, reuses temp arrays</optimization>
    <optimization name="bulk-operations">Collect DOM operations before execution for better performance</optimization>
    <optimization name="regex-reuse">Cached regex patterns TOKEN_REGEX, PLACEHOLDER_REGEX, ATTR_REGEX</optimization>
    <memory-management>
      <markers>Comment markers persist across updates (not recreated)</markers>
      <batch-removal>Collect removals before DOM operations</batch-removal>
      <deferred-cleanup>setTimeout for non-blocking cleanup</deferred-cleanup>
      <effect-arrays>Effects stored in arrays (push for multiple)</effect-arrays>
      <weakmap-cache>Template cache uses WeakMap for auto garbage collection</weakmap-cache>
      <shallow-cloning>Only mutable parts of AST cloned during substitution</shallow-cloning>
      <collection-reuse>ForEach reuses collections (clear instead of allocate), swaps references</collection-reuse>
      <portal-tracking>Portal nodes tracked in arrays for proper cleanup</portal-tracking>
    </memory-management>
  </performance>
  <usage-patterns>
    <pattern name="basic-rendering">Mount static and reactive content using html`` templates</pattern>
    <pattern name="event-handling">Attach handlers via on: prefix for automatic delegation</pattern>
    <pattern name="reactive-bindings">Use bind: prefix for attributes that update with signals</pattern>
    <pattern name="list-rendering">ForEach for keyed lists with minimal DOM operations and LIS algorithm</pattern>
    <pattern name="conditional-rendering">Functions returning HellaNodes for dynamic content</pattern>
    <pattern name="lifecycle-hooks">beforeMount, afterMount, beforeDestroy, afterDestroy via hook: prefix</pattern>
    <pattern name="custom-elements">Define reusable web components with element() and reactive props</pattern>
    <pattern name="portals">Render content to different DOM locations while maintaining reactivity</pattern>
    <pattern name="lazy-loading">Lazy load async components with optional loading state, error boundaries, and fallback content</pattern>
    <pattern name="dom-refs">Access and manipulate existing DOM via $ref() with auto-watching</pattern>
    <pattern name="dom-collections">Access and manipulate multiple DOM elements via $collection()</pattern>
    <pattern name="method-chaining">Chain bind(), on(), hooks() calls on $ref/$collection for fluent API</pattern>
    <pattern name="component-scope">Use component() wrapper for automatic effect cleanup in components</pattern>
    <pattern name="error-boundaries">Global onError handler with element error: prefix for fallback/category config</pattern>
  </usage-patterns>
  <non-obvious-behaviors>
    <behavior>html`` caches all templates by TemplateStringsArray identity (WeakMap)</behavior>
    <behavior>Placeholder format uses __SLOT_N__ markers (not __HELLA_N__)</behavior>
    <behavior>Root-level interpolation html`${value}` returns value directly unwrapped</behavior>
    <behavior>Dynamic components &lt;${Comp}&gt; create HtmlDynamicComponent with placeholder index</behavior>
    <behavior>Props merging - dynamic components collect props, on, bind, hooks into single props object</behavior>
    <behavior>Children as props - single child unwrapped, multiple wrapped in array as props.children</behavior>
    <behavior>Attribute prefixes - on: events, bind: bindings, hook: lifecycle</behavior>
    <behavior>Boolean attributes - disabled without value becomes true, removed when false/null/undefined</behavior>
    <behavior>AST flattening - children array flattened with .flat() to prevent nesting</behavior>
    <behavior>Fragment tag - multiple root elements wrapped in { tag: "$", children: [...] }</behavior>
    <behavior>Component scope - dynamic components wrapped with component() for effect cleanup</behavior>
    <behavior>Passthrough components - ForEach, Portal, and Lazy bypass component(), called directly</behavior>
    <behavior>$ref().bind() detects form elements - INPUT/TEXTAREA/SELECT use .value instead of .textContent</behavior>
    <behavior>ForEach, Portal, and Lazy use isDynamic flag - mount.ts checks this to call them with parent vs resolving</behavior>
    <behavior>Portal.isPortal flag - mount.ts checks this to call Portal with parent vs resolving</behavior>
    <behavior>Lazy uses isDynamic flag - mount.ts checks this to call Lazy with parent vs resolving</behavior>
    <behavior>Lazy creates start/end comment markers - "lazy-start" and "lazy-end" for boundary management</behavior>
    <behavior>Lazy shows optional loading content while pending - fallback appears only on loader error</behavior>
    <behavior>Lazy loader errors are caught and trigger fallback rendering automatically</behavior>
    <behavior>Lazy component resolution supports functions, HellaNodes, and Promise-based imports</behavior>
    <behavior>Key resolution priority: element.props.key → item.id → array index</behavior>
    <behavior>Reference equality on key match - new item reference triggers re-resolution even if key unchanged</behavior>
    <behavior>Lifecycle hook stacking - hooks stored as arrays, multiple hooks of same type all execute</behavior>
    <behavior>Lifecycle timing - beforeMount sync before appendChild, afterMount deferred via setTimeout</behavior>
    <behavior>beforeUpdate/afterUpdate hooks - run inline within effects when __hella_mounted is true</behavior>
    <behavior>Reactive children wrapped in markers - START/END comments provide stable insertion point</behavior>
    <behavior>Value normalization - false/null/undefined becomes empty string, zero preserved</behavior>
    <behavior>Attribute removal - renderProp removes attribute when value is false/null/undefined</behavior>
    <behavior>Array attribute values - joined with spaces and filtered for falsy (class lists)</behavior>
    <behavior>Event delegation capture phase - document.body.addEventListener(type, handler, true)</behavior>
    <behavior>Event handler lookup via composedPath - pre-computed ancestor chain for faster traversal</behavior>
    <behavior>Comment markers visible in childNodes - empty forEach leaves 2 comment nodes (not in .children)</behavior>
    <behavior>isConnected AND parentNode check - only cleans truly removed nodes, not repositioned</behavior>
    <behavior>Mount queue processing - deferred via setTimeout, skips nodes disconnected before flush</behavior>
    <behavior>__hella_mounted flag - set synchronously in mount() for root, async via MutationObserver for descendants</behavior>
    <behavior>Effects storage - effects stored in array, pushed when multiple on same element</behavior>
    <behavior>Component scope cleanup - __hella_component_scope called during node cleanup</behavior>
    <behavior>Portal cleanup - __hella_portal_cleanup called during marker cleanup</behavior>
    <behavior>element() uses light DOM only - no shadow DOM (breaks reactivity internals)</behavior>
    <behavior>element() props via Proxy - any attribute accessible via props.attrName() without declaration</behavior>
    <behavior>element() reactive props - props are functions tracking internal version signal</behavior>
    <behavior>element() synchronous updates - setAttribute/removeAttribute trigger immediate reactivity</behavior>
    <behavior>element() null for missing - attributes not set return null from prop function</behavior>
    <behavior>element() scope wrapping - render function wrapped in scope() for automatic effect cleanup</behavior>
    <behavior>element() disconnect cleanup - disconnectedCallback disposes scope and resets state</behavior>
    <behavior>element() reconnect fresh - reconnection re-runs render function from scratch</behavior>
    <behavior>element() deferred mount - mount deferred via Promise.resolve().then() for child parsing</behavior>
    <behavior>element() slot capture - children captured once before mount, not reactive to changes</behavior>
    <behavior>element() named slots - child slot attribute maps to props.slots[name], no attribute to props.children</behavior>
    <behavior>element() raw Node projection - slots projected as real DOM nodes, not HellaNodes</behavior>
    <behavior>element() whitespace filtering - text nodes with only whitespace excluded from default slot</behavior>
    <behavior>Global onError handler - catches errors from all HellaJS operations, supports multiple handlers via Set</behavior>
    <behavior>error: prefix - element-level config for fallback, category, and boundary settings</behavior>
    <behavior>Error config resolution - resolveErrorConfig() walks DOM tree, first found wins</behavior>
    <behavior>Boundary caching - __hella_cached_boundary stores lookup result for performance</behavior>
    <behavior>Error sources - reactive children (fallback rendered), bind: callbacks (fallback rendered), on:/e: handlers (fallback rendered), beforeMount hook (no fallback rendered)</behavior>
    <behavior>Infinite loop prevention - WeakSet handlingBoundaries tracks active boundaries</behavior>
    <behavior>Reset functionality - reset() in ErrorContext re-renders __hella_original_node</behavior>
    <behavior>beforeMount hook errors caught but no fallback UI - error logged, element still mounts</behavior>
    <behavior>beforeUpdate/afterUpdate hook errors not caught - run inside effect without try/catch</behavior>
    <behavior>Render phase errors return empty fragment - no element context available</behavior>
  </non-obvious-behaviors>
  <testing-approach>
    <principle>Test real-world DOM rendering patterns, not internal APIs</principle>
    <principle>Verify static and reactive content rendering</principle>
    <principle>Test event delegation and handler invocation</principle>
    <principle>Validate ForEach reconciliation with various scenarios (LIS, fast paths, reference equality)</principle>
    <principle>Ensure lifecycle hooks execute in correct order and timing</principle>
    <principle>Test cleanup when nodes removed from DOM (MutationObserver triggered)</principle>
    <principle>Verify custom elements with props, slots, and lifecycle</principle>
    <principle>Test portal rendering, cleanup, and different insert types</principle>
    <principle>Test lazy component loading, error handling, and fallback rendering</principle>
    <principle>Validate html`` template caching and interpolation</principle>
    <principle>Test $ref and $collection reactive references and auto-watching</principle>
    <principle>Verify method chaining and queued operations on missing elements</principle>
    <principle>Test component scope cleanup and effect isolation</principle>
    <principle>Test error boundaries with nested elements, propagation, reset, and infinite loop prevention</principle>
  </testing-approach>
</dom-package-instructions>
