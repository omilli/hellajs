<store-package-instructions>
  <overview>
    Deeply reactive state management through automatic conversion of plain objects into granular reactive primitives.
  </overview>
  <mental-model>
    <concept>The system transforms plain objects into surgically reactive stores</concept>
    <node type="primitive">Primitives become signals (writable reactive values)</node>
    <node type="object">Objects recursively become nested stores</node>
    <node type="array">Arrays become signals containing the array</node>
    <node type="function">Functions are preserved as-is (utility methods)</node>
    <node type="readonly">Specific properties wrapped in computed for read-only access</node>
  </mental-model>
  <architecture>
    <key-components>
      <component name="store.ts">Public overload declarations for store()</component>
      <component name="create.ts">Core createStore factory — recursive transformation, snapshot/update/cleanup methods</component>
      <component name="draft.ts">Deep clone and change-extraction algorithms for the draft mutator path</component>
      <component name="utils.ts">Shared helpers — isObject, isStore, applyUpdate, wrapWithMiddleware, defineStoreProperty</component>
      <component name="types.d.ts">TypeScript type mappings, conditional readonly inference</component>
    </key-components>
    <data-structures>
      <structure name="Store">
        <mapping>Store&lt;T, R&gt; maps each property of T based on its type</mapping>
        <field name="functions">Preserved as-is</field>
        <field name="arrays">Become Signal&lt;Array&gt;, or () => Array if readonly</field>
        <field name="objects">Recursively become Store&lt;T[K], R&gt;</field>
        <field name="primitives">Become Signal&lt;T&gt;, or () => T if readonly</field>
        <field name="snapshot">() => T — Reactive computed plain object</field>
        <field name="update">(partial: PartialDeep&lt;T&gt; | ((draft: T) => void)) => void</field>
        <field name="cleanup">() => void — Recursive disposal of nested stores</field>
      </structure>
      <structure name="ReservedKeys">
        <value>Set of ["snapshot", "update", "cleanup"] — property names that cannot exist in initial objects</value>
        <usage>Checked during snapshot generation and cleanup traversal</usage>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="Recursive Store Initialization">
        <purpose>Transform plain object into nested reactive structure</purpose>
        <step>Loop Object.entries, handle each value type</step>
        <step>Function: Preserve via defineStoreProperty</step>
        <step>Plain object: Recursively call createStore() to create nested store</step>
        <step>Primitive/Array: Create signal, wrap in computed if readonly</step>
        <step>Readonly check: readonlyAll || readonlyKeys.includes(key)</step>
        <insight>Readonly properties are signals wrapped in computed(() => sig()), preventing writes while maintaining getter syntax</insight>
      </algorithm>
      <algorithm name="update() Partial Deep Merge">
        <purpose>Surgically update deeply nested properties</purpose>
        <step>Iterate partial object entries</step>
        <step>If value is plain object AND "update" in current → recurse via update()</step>
        <step>Otherwise → applyUpdate(current, value)</step>
        <step>Draft path: deep clone snapshot, let user mutate, extractChanges to diff</step>
      </algorithm>
      <algorithm name="snapshot Computed">
        <purpose>Reactive plain object representation of entire state</purpose>
        <step>Iterate all non-reserved keys via Object.keys</step>
        <step>If value is function and original was function → preserve original</step>
        <step>If value has snapshot method (nested store) → call value.snapshot()</step>
        <step>Otherwise → call value() to get signal value</step>
        <insight>Computed re-runs when ANY accessed signal changes, flattening reactive tree to plain object</insight>
      </algorithm>
      <algorithm name="cleanup() Recursive Disposal">
        <purpose>Prevent memory leaks by disposing nested stores</purpose>
        <step>Recursive deepCleanup traversal</step>
        <step>Skip reserved keys</step>
        <step>If property has cleanup function → call it</step>
        <step>If property is object → recurse into it</step>
        <insight>Individual signals are NOT disposed — they remain functional after cleanup. Only the store structure is torn down.</insight>
      </algorithm>
      <algorithm name="Reserved Key Validation">
        <purpose>Prevent users from colliding with snapshot/update/cleanup method names</purpose>
        <step>Detect if initial itself is store-shaped (has all 3 reserved methods) → composition path, skip check</step>
        <step>For non-store initial, throw on any reserved key with any value</step>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="reservedKeys as Set">O(1) lookup vs array.includes O(n)</optimization>
    <optimization name="Type guards">typeof checks are JIT-optimized</optimization>
    <optimization name="defineStoreProperty">Reusable helper reduces code duplication</optimization>
    <optimization name="Lazy snapshot">Computed only runs when accessed, not on every change</optimization>
    <optimization name="Direct property access">No proxy overhead, properties are actual signals/stores</optimization>
    <memory-management>
      <strategy>Recursive cleanup traverses entire tree</strategy>
      <strategy>Store structure created once, properties reused</strategy>
      <strategy>Readonly wraps signals in computed (small overhead) vs preventing writes at runtime</strategy>
      <strategy>No intermediate objects during updates (applyUpdate calls signals directly)</strategy>
    </memory-management>
    <tradeoff>Recursive store creation has upfront cost but enables granular reactivity (only changed signals notify), no diffing overhead, type-safe access</tradeoff>
  </performance>
  <non-obvious-behaviors>
    <behavior>update() ignores new keys — only updates keys present in initial object, silently skips others</behavior>
    <behavior>Nested object detection uses isPlainObject (excludes arrays, null, functions) to determine recursion</behavior>
    <behavior>applyUpdate on undefined — early return if target undefined (prevents errors on missing keys)</behavior>
    <behavior>Functions in snapshot — preserved from original, not from store (original !== store property for functions)</behavior>
    <behavior>Readonly enforcement happens at creation (computed wrap), not at runtime (no setter checks)</behavior>
    <behavior>Array handling — arrays become signals, not stores (no per-element reactivity)</behavior>
    <behavior>null/undefined primitives — become signals like any primitive value</behavior>
    <behavior>defineStoreProperty writable: true — allows store properties to be reassigned (loses reactivity if overwritten)</behavior>
    <behavior>Cleanup doesn't null properties — just calls cleanup on nested values, properties remain accessible</behavior>
    <behavior>Recursive store() call — nested stores have no readonly inheritance (each level independent)</behavior>
    <behavior>isPlainObject in update — determines deep merge vs direct assignment, critical for nested stores</behavior>
    <behavior>extractChanges shallow-equal — arrays use reference equality on elements; objects within arrays must be replaced to detect changes</behavior>
    <behavior>Reserved keys throw — passing snapshot/update/cleanup as property names throws at create time, except when initial is store-shaped (composition path)</behavior>
    <behavior>deepClone limited — handles plain objects and arrays only; Date, Map, Set, RegExp pass through by reference</behavior>
  </non-obvious-behaviors>
  <testing-approach>
    <principle>Test real-world integration patterns with stores containing all data types</principle>
    <principle>Verify partial update, draft mutator, and middleware paths independently</principle>
    <principle>Test snapshot reactivity across flat and deeply nested stores</principle>
    <principle>Verify cleanup behavior — nested stores disposed but signals remain functional</principle>
    <principle>Test readonly enforcement prevents updates via both direct setter and update()</principle>
    <principle>Verify nested stores share signal references bidirectionally</principle>
    <principle>Use mock() for tracking effect execution counts</principle>
  </testing-approach>
</store-package-instructions>
