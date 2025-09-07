<technical-internals>
  <core-architecture>
    <reactive-node-system>
      <node-structure>
        Every reactive primitive (signal, computed, effect) is a node in a dependency graph implemented as doubly-linked lists. Each node maintains four critical pointers: rd (dependencies), rs (subscribers), rpd (previous dependency during tracking), rps (previous subscriber). The rf (reactive flags) field uses bit manipulation for efficient state management with flags like F.D (dirty), F.P (pending), F.T (tracking), F.M (computing), F.W (writable), F.G (guarded effect).
      </node-structure>
      <dependency-graph-structure>
        Dependencies form a DAG where each Link connects a source (ls) to target (lt) with bidirectional navigation: lps/lns for subscriber chains, lpd/lnd for dependency chains. This enables O(1) insertion/removal and efficient graph traversal. The graph supports cycles during construction but resolves to acyclic structure through topological execution.
      </dependency-graph-structure>
    </reactive-node-system>
    <execution-engine>
      <propagation-algorithm>
        Change propagation uses a two-phase system: marking and execution. When a signal changes, propagate() walks the subscriber linked list, upgrading F.P (pending) nodes to F.D (dirty) and scheduling effects with F.G flag. This ensures proper topological ordering and prevents duplicate executions in diamond dependency patterns.
      </propagation-algorithm>
      <lazy-vs-eager-evaluation>
        Computed values use lazy evaluation - marked dirty but only recalculated when accessed via executeComputed(). Effects use eager evaluation - immediately scheduled via scheduleEffect() and executed in dependency order. This hybrid approach optimizes performance by avoiding unnecessary computations while ensuring side effects run promptly.
      </lazy-vs-eager-evaluation>
      <stale-validation-system>
        validateStale() performs recursive dependency validation using an iterative algorithm with explicit stack management. It traverses dependency chains depth-first, validating each source's freshness. Sources marked F.P (pending) require deep validation, while F.D (dirty) sources need value updates. The algorithm handles complex nested dependencies and prevents infinite loops.
      </stale-validation-system>
    </execution-engine>
    <memory-optimization>
      <link-recycling>
        createLink() implements intelligent link reuse during dependency tracking. When a node re-executes, it attempts to reuse existing links to the same source rather than allocating new ones. This dramatically reduces garbage collection pressure in hot paths and improves performance consistency.
      </link-recycling>
      <tracking-lifecycle>
        startTracking() resets rpd pointer and sets F.T flag, preparing for fresh dependency collection. endTracking() removes stale dependencies (everything after rpd or from rd if nothing accessed) and clears F.T flag. This automatic cleanup prevents memory leaks and keeps the dependency graph minimal.
      </tracking-lifecycle>
      <flag-optimization>
        Bit flags in rf field enable efficient state queries: (rf & F.D) checks dirty, (rf & (F.P | F.D)) === F.P detects pending-only state. Complex conditions like (rf & (F.W | F.D)) === (F.W | F.D) identify writable dirty signals in single operations, avoiding multiple property accesses.
      </flag-optimization>
    </memory-optimization>
  </core-architecture>
  <synchronization-mechanisms>
    <batch-system>
      <batching-implementation>
        batch() increments batchDepth counter, executes the callback, then flushes when depth returns to zero. During batching, effects are queued in effectQueue but not executed, preventing intermediate runs. The system maintains effect execution order through proper queuing and ensures all batched updates complete atomically.
      </batching-implementation>
      <effect-scheduling>
        scheduleEffect() adds effects to effectQueue with deduplication - effects already queued (SCHEDULED flag) are skipped. Effects execute in dependency order during flush(), with nested dependencies processed recursively. The queueIndex tracks current execution position for proper ordering.
      </effect-scheduling>
    </batch-system>
    <change-detection>
      <deep-equality-algorithm>
        deepEqual() performs structural comparison for objects/arrays while using reference equality for primitives. Special handling for Maps/Sets, constructor comparison for type safety, and recursive traversal for nested structures. This enables automatic optimization where identical values don't trigger updates, reducing unnecessary propagation.
      </deep-equality-algorithm>
      <value-update-protocol>
        updateValue() executes signal/computed functions, compares results with deepEqual(), and updates cached values only when different. For signals, sbv (base value) and sbc (cached value) are synchronized. For computed values, cbc (cached value) stores results. Change detection drives the entire propagation system.
      </value-update-protocol>
    </change-detection>
    <context-management>
      <tracking-context>
        setCurrentSub() establishes reactive context using currentValue stack. During execution, any signal reads create dependencies to this context. The stack enables nested computations and effects, with each level maintaining its own dependency tracking. This context-switching is critical for automatic dependency collection.
      </tracking-context>
      <untracked-execution>
        untracked() temporarily nulls the current reactive context, allowing signal reads without dependency creation. Essential for escape hatches, debugging, and scenarios where reactive relationships would create unwanted updates. Implementation preserves context stack integrity through proper save/restore.
      </untracked-execution>
    </context-management>
  </synchronization-mechanisms>
  <performance-characteristics>
    <computational-complexity>
      <dependency-operations>
        Link creation/removal: O(1) due to doubly-linked list structure. Dependency traversal: O(n) where n is dependency count, but typically small. Propagation: O(subscribers) per changed signal. Effect execution: O(effects) with topological ordering ensuring each effect runs exactly once per update cycle.
      </dependency-operations>
      <memory-patterns>
        Reactive nodes have fixed overhead: ~8 pointers + flags + values. Links add ~6 pointers each. Link recycling during tracking reduces allocation pressure. Automatic cleanup in endTracking() prevents memory leaks. Cache-friendly doubly-linked lists enable efficient traversal.
      </memory-patterns>
    </computational-complexity>
    <optimization-strategies>
      <diamond-problem-solution>
        The system prevents duplicate executions in diamond patterns through proper state management. Nodes transition F.C → F.P → F.D during propagation. Only F.D nodes trigger recomputation, and only when values actually change via deepEqual(). This ensures each computation runs exactly once per update cycle regardless of dependency graph complexity.
      </diamond-problem-solution>
      <topological-execution>
        Effects execute in dependency order through recursive processing in executeEffect(). The algorithm processes dependencies depth-first, ensuring parent computations complete before child effects run. SCHEDULED flag prevents duplicate processing during recursive traversal.
      </topological-execution>
      <early-termination>
        When computed values return identical results (deepEqual returns true), propagation stops immediately. This optimization is crucial for derived values that normalize input variations or implement filters. Combined with lazy evaluation, it prevents cascading unnecessary updates.
      </early-termination>
    </optimization-strategies>
  </performance-characteristics>
  <edge-case-handling>
    <circular-dependency-prevention>
      <construction-phase>
        During reactive graph construction, temporary cycles may exist but are resolved through proper execution ordering. The F.M (computing) flag prevents infinite recursion during computation execution. Self-referential effects are prevented through F.G (guarded) flag checking.
      </construction-phase>
      <runtime-protection>
        validateStale() uses explicit stack management instead of recursion to handle deep dependency chains without stack overflow. The algorithm tracks depth and unwinds properly, handling complex nested validation scenarios that could otherwise cause infinite loops.
      </runtime-protection>
    </circular-dependency-prevention>
    <cleanup-and-disposal>
      <effect-cleanup>
        Effect disposal removes the effect from all dependency subscriber lists, clears its own dependency links, and marks it as disposed. This complete disconnection prevents memory leaks and ensures disposed effects never execute again. The cleanup process is atomic and safe to call multiple times.
      </effect-cleanup>
      <automatic-dependency-management>
        Each tracking cycle automatically removes stale dependencies through endTracking(). Dependencies not accessed during execution are assumed stale and removed from the graph. This keeps the dependency graph minimal and prevents accumulation of unused relationships over time.
      </automatic-dependency-management>
    </cleanup-and-disposal>
    <error-handling-semantics>
      <exception-propagation>
        Exceptions during computed/effect execution are propagated after proper cleanup. The tracking context is always restored via try/finally blocks, ensuring reactive system state remains consistent even when user code throws. Partially constructed dependency relationships are properly cleaned up.
      </exception-propagation>
      <state-consistency>
        All state transitions use atomic flag operations. Even during exceptions, reactive nodes maintain valid state (flags, links, values). The system can recover from errors and continue normal operation without corruption of the dependency graph structure.
      </state-consistency>
    </error-handling-semantics>
  </edge-case-handling>
  <advanced-internals>
    <flag-state-machine>
      <state-transitions>
        Clean (F.C) → Pending (F.P) during propagation marking → Dirty (F.D) when definitely stale → Computing (F.M) during execution → Clean (F.C) when complete. Tracking (F.T) overlays during dependency collection. Writable (F.W) distinguishes signals from computed values. Guarded (F.G) marks effects for execution scheduling.
      </state-transitions>
      <concurrent-state-handling>
        Multiple flags can be active simultaneously: F.T | F.M during computed execution with dependency tracking, F.D | F.P during propagation phases. The system handles these combinations correctly through careful bit masking and state checks throughout the codebase.
      </concurrent-state-handling>
    </flag-state-machine>
    <execution-context-stack>
      <context-switching-protocol>
        currentValue maintains execution context stack. setCurrentSub() pushes new context, returns previous for restoration. This enables nested reactive execution: effects can contain computed values, which can read signals, each maintaining proper dependency relationships to their immediate context.
      </context-switching-protocol>
      <stack-integrity>
        Context stack must be properly managed even during exceptions. All execution paths use try/finally to ensure context restoration. Stack corruption would break dependency tracking, so this integrity is critical for system reliability.
      </stack-integrity>
    </execution-context-stack>
    <link-management-details>
      <bidirectional-linking>
        Each Link maintains 6 pointers: ls/lt for endpoints, lps/lns for subscriber chain navigation, lpd/lnd for dependency chain navigation. This enables efficient insertion, removal, and traversal in both directions without additional data structures.
      </bidirectional-linking>
      <link-lifecycle>
        Links are created during dependency establishment, potentially reused during tracking, and removed during cleanup or disposal. The createLink() function handles both fresh allocation and reuse scenarios, while removeLink() handles proper chain unlinking without breaking list integrity.
      </link-lifecycle>
    </link-management-details>
  </advanced-internals>
  <testing-and-debugging>
    <topology-validation>
      <diamond-pattern-testing>
        Tests verify that diamond dependency patterns (A→B,C→D) execute each computation exactly once per update cycle. This validates the core optimization that prevents duplicate work in complex dependency graphs while ensuring all dependent values update correctly.
      </diamond-pattern-testing>
      <execution-order-verification>
        Topological execution tests ensure effects run in dependency order: parent computations complete before child effects execute. This is critical for maintaining consistency when effects depend on computed values or other effects.
      </execution-order-verification>
    </topology-validation>
    <edge-case-coverage>
      <stale-validation-scenarios>
        Tests cover deep dependency chains, partial staleness (some dependencies stale, others fresh), and complex validation scenarios where nested computations may or may not need updates. These test the validateStale() algorithm's correctness.
      </stale-validation-scenarios>
      <cleanup-verification>
        Tests ensure proper cleanup of disposed effects, automatic removal of stale dependencies, and memory leak prevention. Critical for long-running applications that create/destroy many reactive relationships over time.
      </cleanup-verification>
    </edge-case-coverage>
  </testing-and-debugging>
</technical-internals>