---
applyTo: "packages/core/**"
---

<core-package-instructions>
  <overview>
    High-performance reactive primitives using doubly-linked dependency graphs and topological execution. Implements a directed acyclic graph where signals are sources, computed values are transforms, and effects are sinks. Updates propagate through the graph in topological order with glitch-free guarantees (each node executes max once per update).
  </overview>
  <mental-model>
    <concept>The system is a directed acyclic graph (DAG)</concept>
    <node type="signal">Sources - writable reactive state containers</node>
    <node type="computed">Transforms - derived values that auto-update</node>
    <node type="effect">Sinks - side effects that run on dependency changes</node>
    <edges>Dependency relationships via doubly-linked lists</edges>
    <propagation>Updates flow through graph in topological order</propagation>
    <guarantee>Glitch-free execution - each node executes max once per update</guarantee>
  </mental-model>
  <architecture>
    <data-structures>
      <structure name="ReactiveBase">
        <field name="rd">First dependency link (what this node depends on)</field>
        <field name="rpd">Tracking bookmark (last accessed dependency, enables link reuse)</field>
        <field name="rs">First subscriber link (who depends on this node)</field>
        <field name="rps">Previous subscriber pointer (for cleanup)</field>
        <field name="rf">Bitmask flags (state machine: CLEAN, WRITABLE, GUARDED, TRACKING, DIRTY, PENDING, SCHEDULED)</field>
      </structure>
      <structure name="SignalState">
        <extends>ReactiveBase</extends>
        <field name="sbv">Base value (last confirmed value after executeSignal)</field>
        <field name="sbc">Current value (potentially uncommitted during propagation)</field>
      </structure>
      <structure name="ComputedState">
        <extends>ReactiveBase</extends>
        <field name="cbc">Cached computed value</field>
        <field name="cbf">Compute function (receives previous value)</field>
      </structure>
      <structure name="EffectState">
        <extends>ReactiveBase</extends>
        <field name="ef">Effect function to execute</field>
      </structure>
      <structure name="Link">
        <field name="ls">Source node (what we depend on)</field>
        <field name="lt">Target node (who depends on source)</field>
        <field name="lpd">Previous dependency link in target's dependency list</field>
        <field name="lnd">Next dependency link in target's dependency list</field>
        <field name="lps">Previous subscriber link in source's subscriber list</field>
        <field name="lns">Next subscriber link in source's subscriber list</field>
      </structure>
    </data-structures>
    <state-machine>
      <flag name="CLEAN" value="0">No pending updates</flag>
      <flag name="WRITABLE" value="1">Signal marker (writable node)</flag>
      <flag name="GUARDED" value="2">Effect marker (prevents self-triggering)</flag>
      <flag name="TRACKING" value="4">Currently tracking dependencies</flag>
      <flag name="COMPUTING" value="8">Currently executing (cleared by startTracking)</flag>
      <flag name="DIRTY" value="16">Definitely needs re-execution</flag>
      <flag name="PENDING" value="32">Might need re-execution (validate first)</flag>
      <flag name="SCHEDULED" value="128">Effect queued in scheduler (internal)</flag>
      <transition from="CLEAN" to="PENDING">Dependency changed (propagateChange)</transition>
      <transition from="PENDING" to="DIRTY">Source value confirmed changed (propagate)</transition>
      <transition from="DIRTY" to="TRACKING">Started execution (startTracking)</transition>
      <transition from="TRACKING" to="CLEAN">Finished execution (endTracking)</transition>
    </state-machine>
    <key-algorithms>
      <algorithm name="propagateChange">
        <purpose>Mark subscribers as PENDING when dependency might have changed</purpose>
        <strategy>Depth-first traversal using manual stack with sibling tracking</strategy>
        <step>Start from first subscriber link</step>
        <step>Process WRITABLE signals depth-first (traverse their subscribers)</step>
        <step>Mark clean nodes as PENDING</step>
        <step>Schedule GUARDED nodes (effects) via scheduleEffect</step>
        <step>Use pooled stack frames to minimize allocations</step>
        <step>Skip already-processing nodes (TRACKING|COMPUTING|DIRTY|PENDING)</step>
        <optimization>Stack pooling reuses frames in hot paths</optimization>
      </algorithm>
      <algorithm name="propagate">
        <purpose>Upgrade PENDING nodes to DIRTY when source value confirmed changed</purpose>
        <strategy>Linear walk through subscriber list</strategy>
        <step>Only upgrades nodes that are PENDING but not DIRTY</step>
        <step>Schedules GUARDED effects for execution</step>
      </algorithm>
      <algorithm name="validateStale">
        <purpose>Determine if PENDING node actually needs re-execution</purpose>
        <strategy>Recursive validation with stack pooling</strategy>
        <step>If source is WRITABLE|DIRTY: update it, check if value changed</step>
        <step>If source is WRITABLE|PENDING: recurse into its dependencies</step>
        <step>If value unchanged: clear PENDING flag (skip update)</step>
        <step>Stack-based unwinding with propagate calls for multi-subscriber sources</step>
        <insight>Enables "skip update" optimization when computed dependencies unchanged</insight>
      </algorithm>
      <algorithm name="tracking">
        <phase name="startTracking">
          <step>Reset rpd to undefined (fresh tracking bookmark)</step>
          <step>Clear COMPUTING|DIRTY|PENDING flags, set TRACKING</step>
          <step>Marks beginning of dependency collection</step>
        </phase>
        <phase name="dependency-collection">
          <step>Check currentValue to know if in reactive context</step>
          <step>Call createLink to establish bidirectional edges</step>
          <step>Reuse existing links when rpd.ls === source</step>
          <step>Allocate from pool or create new link otherwise</step>
        </phase>
        <phase name="endTracking">
          <step>Remove dependencies after rpd (not accessed this run)</step>
          <step>Clear TRACKING flag</step>
          <step>Enables dynamic dependency graphs</step>
        </phase>
      </algorithm>
      <algorithm name="scheduler">
        <purpose>Batch and execute effects in dependency order</purpose>
        <component name="effectQueue">Array of scheduled effects</component>
        <component name="scheduleEffect">Adds effect if not SCHEDULED flag</component>
        <component name="flush">Processes queue, executing effects in order</component>
        <component name="executeEffect">
          <step>If DIRTY or (PENDING and validateStale): execute function</step>
          <step>Set reactive context, start/end tracking for fresh dependencies</step>
          <step>If just PENDING (not stale): clear PENDING flag</step>
          <step>Recursively execute scheduled dependencies in order</step>
        </component>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="inline-flag-checks">Bitwise operations instead of function calls</optimization>
    <optimization name="link-pooling">linkPool reuses Link objects (createLink/removeLink)</optimization>
    <optimization name="stack-pooling">stackPool in propagation and validation minimizes allocations</optimization>
    <optimization name="early-exits">Check flags before traversing subscribers</optimization>
    <optimization name="cached-values">Only recompute if dirty or pending-with-stale-deps</optimization>
    <optimization name="reference-equality">Skip propagation when value unchanged (===)</optimization>
    <optimization name="link-reuse">During tracking, reuse existing links via rpd bookmark</optimization>
    <memory-management>
      <gc>Computed nodes auto-GC when last subscriber removed</gc>
      <pooling>Links returned to pool on removal</pooling>
      <compaction>Effect queue compacts when oversized (over 64 slots and over 4x current count)</compaction>
      <reuse>Dependency lists reuse links during tracking</reuse>
      <lazy-allocation>Scopes only create Set when effects registered</lazy-allocation>
    </memory-management>
  </performance>
  <usage-patterns>
    <pattern name="basic-reactivity">Create signals, computed values, and effects that auto-track dependencies</pattern>
    <pattern name="batching-updates">Group multiple signal updates to run effects once with consistent state</pattern>
    <pattern name="conditional-dependencies">Computed/effects with dynamic dependencies based on runtime conditions</pattern>
    <pattern name="lifecycle-management">Use scope to batch-cleanup multiple effects for component lifecycle</pattern>
    <pattern name="untracked-reads">Read reactive state without creating dependencies to prevent re-triggers</pattern>
  </usage-patterns>
  <non-obvious-behaviors>
    <behavior>Signal getter triggers propagate when dirty - executeSignal commits value, then propagate(rs) upgrades PENDING to DIRTY</behavior>
    <behavior>Computed initializes WRITABLE|DIRTY - starts dirty, WRITABLE used for polymorphic dispatch</behavior>
    <behavior>Effects link to parent effects - currentValue check creates effect hierarchy</behavior>
    <behavior>rpd is tracking bookmark - marks last accessed dependency, not last in list</behavior>
    <behavior>SCHEDULED flag is local - defined in scheduler.ts (128), prevents double-queuing</behavior>
    <behavior>Batch depth zero triggers flush - decrement check (!--batchDepth) flushes when zero</behavior>
    <behavior>removeLink auto-GCs computed - when no subscribers (!lps and !ls.rs), recursively removes dependencies</behavior>
    <behavior>executeEffect processes nested scheduled - after running, walks dependencies executing SCHEDULED ones</behavior>
    <behavior>Reference equality for updates - uses !== like Preact/Alien Signals, new object instances always trigger</behavior>
  </non-obvious-behaviors>
  <testing-approach>
    <principle>Test real-world integration patterns, not internal APIs</principle>
    <principle>Cover primitive and reference type reactivity</principle>
    <principle>Verify glitch-free guarantees in complex dependency graphs</principle>
    <principle>Test diamond patterns, lazy branches, conditional dependencies</principle>
    <principle>Validate batching, untracked, scope behaviors</principle>
    <principle>Ensure computed caching and skip-update optimizations work</principle>
  </testing-approach>
</core-package-instructions>
