<dom-package-instructions>
  <overview>
    Surgical DOM updates without virtual DOM diffing. Only elements with reactive dependencies update, not entire trees. Features automatic cleanup via MutationObserver (auto-disposes effects/events on node removal), global event delegation (single listener per type on document.body), and keyed list reconciliation using LIS algorithm for minimal moves.
  </overview>
  <mental-model>
    <concept>Surgical updates - only reactive elements update, not entire trees</concept>
    <cleanup>MutationObserver auto-disposes effects and events on node removal</cleanup>
    <events>Global delegation via single listener per type (capture phase)</events>
    <lists>Keyed reconciliation using LIS algorithm for minimal DOM moves</lists>
    <portals>Render children to different DOM locations with lifecycle tracking</portals>
    <elements>Custom elements with light DOM for full compatibility</elements>
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
      </structure>
      <structure name="HellaNode">
        <field name="tag">Element tag name or "$" for fragment</field>
        <field name="props">Static attributes object</field>
        <field name="on">Event handlers object (on: prefix)</field>
        <field name="bind">Reactive bindings object (bind: prefix)</field>
        <field name="hooks">Lifecycle hooks object (hooks: prefix)</field>
        <field name="children">Array of HellaChild elements</field>
        <field name="__scope">Component scope disposer (attached by component())</field>
      </structure>
      <structure name="ForEach internals">
        <field name="keyToNode">Map from key to DOM Node</field>
        <field name="keyToItem">Map from key to item reference</field>
        <field name="currentKeys">Array preserving key order for diffing</field>
        <field name="startMarker">Comment node marking list start</field>
        <field name="endMarker">Comment node marking list end</field>
        <optimization>Collections cleared and reused (not reallocated)</optimization>
      </structure>
      <structure name="html template internals">
        <field name="templateCache">WeakMap from TemplateStringsArray to HtmlInternalNode</field>
        <field name="componentRegistry">Map from Function to ComponentFn (unused)</field>
        <marker name="HtmlPlaceholder">{ __placeholder: index }</marker>
        <marker name="HtmlDynamicComponent">{ __dynamicComponent: index, props, children }</marker>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="html-parsing">
        <purpose>Parse HTML string to HellaNode AST with placeholder markers</purpose>
        <tokenization>Single regex matches closing tags, opening/self-closing tags, attributes, text</tokenization>
        <attribute-parsing>Separate regex categorizes by prefix: on:, bind:, hooks:, or props</attribute-parsing>
        <optimization>First char code check (h=104, b=98, o=111) for prefix detection</optimization>
        <stack-based>Stack tracks nesting depth, builds tree bottom-up</stack-based>
        <placeholders>__SLOT_N__ markers remain in AST for value substitution</placeholders>
        <dynamic-tags>&lt;${Component}&gt; becomes HtmlDynamicComponent with placeholder index</dynamic-tags>
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
        <key-resolution>From element.props.key or defaults to array index</key-resolution>
        <reference-equality>Item reference !== triggers re-resolution even if key matches</reference-equality>
        <memory-optimization>Collections swapped (not reallocated) after render</memory-optimization>
      </algorithm>
      <algorithm name="event-delegation">
        <purpose>Single listener per event type for efficient event handling</purpose>
        <registration>document.body.addEventListener(type, handler, true) in capture phase</registration>
        <path-traversal>composedPath() provides pre-computed ancestor chain</path-traversal>
        <fast-exit>handlerCounts.has(type) check skips if no handlers registered</fast-exit>
        <handler-lookup>Walk composedPath, check __hella_handlers[type] on each element</handler-lookup>
        <invocation>handler.call(element, event) maintains correct context</invocation>
        <no-stop>Traverses entire path by default (no automatic stopPropagation)</no-stop>
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
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="while-loops">While loops with cached length for hot paths</optimization>
    <optimization name="fragment-batching">DocumentFragment for bulk DOM inserts</optimization>
    <optimization name="map-swapping">Swap Map references instead of recreation</optimization>
    <optimization name="early-exits">Fast paths for common scenarios (first render, empty, complete replace)</optimization>
    <optimization name="array-join">Array.join for string building instead of +=</optimization>
    <optimization name="direct-property-checks">Object.hasOwn() for type guards</optimization>
    <optimization name="char-code-checks">First char code for attribute prefix detection</optimization>
    <optimization name="handler-count">Fast exit in delegation if no handlers for event type</optimization>
    <memory-management>
      <markers>Comment markers persist across updates (not recreated)</markers>
      <batch-removal>Collect removals before DOM operations</batch-removal>
      <deferred-cleanup>setTimeout for non-blocking cleanup</deferred-cleanup>
      <effect-arrays>Effects stored in arrays (push for multiple)</effect-arrays>
      <weakmap-cache>Template cache uses WeakMap for auto garbage collection</weakmap-cache>
      <shallow-cloning>Only mutable parts of AST cloned during substitution</shallow-cloning>
      <collection-reuse>ForEach reuses collections (clear instead of allocate)</collection-reuse>
    </memory-management>
  </performance>
  <usage-patterns>
    <pattern name="basic-rendering">Mount static and reactive content using html`` templates</pattern>
    <pattern name="event-handling">Attach handlers via on: prefix for automatic delegation</pattern>
    <pattern name="reactive-bindings">Use bind: prefix for attributes that update with signals</pattern>
    <pattern name="list-rendering">ForEach for keyed lists with minimal DOM operations</pattern>
    <pattern name="conditional-rendering">Functions returning HellaNodes for dynamic content</pattern>
    <pattern name="lifecycle-hooks">beforeMount, afterMount, beforeDestroy, afterDestroy via hooks: prefix</pattern>
    <pattern name="custom-elements">Define reusable web components with element()</pattern>
    <pattern name="portals">Render content to different DOM locations while maintaining reactivity</pattern>
    <pattern name="dom-refs">Access and manipulate existing DOM via $ref()</pattern>
  </usage-patterns>
  <non-obvious-behaviors>
    <behavior>html`` caches all templates by TemplateStringsArray identity (WeakMap)</behavior>
    <behavior>Placeholder format uses __SLOT_N__ markers (not __HELLA_N__)</behavior>
    <behavior>Root-level interpolation html`${value}` returns value directly unwrapped</behavior>
    <behavior>Dynamic components &lt;${Comp}&gt; create HtmlDynamicComponent with placeholder index</behavior>
    <behavior>Props merging - dynamic components collect props, on, bind, hooks into single props object</behavior>
    <behavior>Children as props - single child unwrapped, multiple wrapped in array as props.children</behavior>
    <behavior>Attribute prefixes - on: events, bind: bindings, hooks: lifecycle</behavior>
    <behavior>Boolean attributes - disabled without value becomes true, removed when false/null/undefined</behavior>
    <behavior>AST flattening - children array flattened with .flat() to prevent nesting</behavior>
    <behavior>Fragment tag - multiple root elements wrapped in { tag: "$", children: [...] }</behavior>
    <behavior>Component scope - dynamic components wrapped with component() for effect cleanup</behavior>
    <behavior>Passthrough components - ForEach and Portal bypass component(), called directly</behavior>
    <behavior>$ref().bind() detects form elements - INPUT/TEXTAREA/SELECT use .value instead of .textContent</behavior>
    <behavior>ForEach.isForEach flag - mount.ts checks this to call ForEach with parent vs resolving</behavior>
    <behavior>Portal.isPortal flag - mount.ts checks this to call Portal with parent vs resolving</behavior>
    <behavior>Keys default to index - no props.key uses array index (causes replacement vs reordering)</behavior>
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
  </non-obvious-behaviors>
  <testing-approach>
    <principle>Test real-world DOM rendering patterns, not internal APIs</principle>
    <principle>Verify static and reactive content rendering</principle>
    <principle>Test event delegation and handler invocation</principle>
    <principle>Validate ForEach reconciliation with various scenarios</principle>
    <principle>Ensure lifecycle hooks execute in correct order</principle>
    <principle>Test cleanup when nodes removed from DOM</principle>
    <principle>Verify custom elements with props, slots, and lifecycle</principle>
    <principle>Test portal rendering and cleanup</principle>
    <principle>Validate html`` template caching and interpolation</principle>
  </testing-approach>
</dom-package-instructions>
