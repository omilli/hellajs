<technical-internals>
  <core-architecture>
    <reactive-node-system>
      <node-structure>
        Every reactive primitive (signal, computed, effect) is a node in a dependency graph implemented as doubly-linked lists. Each node maintains critical pointers for dependencies, subscribers, and tracking state. Internal flags use bit manipulation for efficient state management including dirty, pending, tracking, computing, writable, and guarded states.
      </node-structure>
      <dependency-graph-structure>
        Dependencies form a DAG where each link connects sources to targets with bidirectional navigation through subscriber and dependency chains. This enables O(1) insertion/removal and efficient graph traversal. The graph supports cycles during construction but resolves to acyclic structure through topological execution.
      </dependency-graph-structure>
    </reactive-node-system>
    <execution-engine>
      <propagation-algorithm>
        Change propagation uses a two-phase system: marking and execution. When a signal changes, the system walks the subscriber linked list, upgrading pending nodes to dirty and scheduling effects. This ensures proper topological ordering and prevents duplicate executions in diamond dependency patterns.
      </propagation-algorithm>
      <lazy-vs-eager-evaluation>
        Computed values use lazy evaluation - marked dirty but only recalculated when accessed. Effects use eager evaluation - immediately scheduled and executed in dependency order. This hybrid approach optimizes performance by avoiding unnecessary computations while ensuring side effects run promptly.
      </lazy-vs-eager-evaluation>
      <stale-validation-system>
        The system performs recursive dependency validation using an iterative algorithm with explicit stack management. It traverses dependency chains depth-first, validating each source's freshness. Sources marked pending require deep validation, while dirty sources need value updates. The algorithm handles complex nested dependencies and prevents infinite loops.
      </stale-validation-system>
    </execution-engine>
    <memory-optimization>
      <link-recycling>
        The system implements intelligent link reuse during dependency tracking. When a node re-executes, it attempts to reuse existing links to the same source rather than allocating new ones. This dramatically reduces garbage collection pressure in hot paths and improves performance consistency.
      </link-recycling>
      <tracking-lifecycle>
        Tracking initialization resets internal pointers and sets tracking flags, preparing for fresh dependency collection. Tracking completion removes stale dependencies and clears tracking flags. This automatic cleanup prevents memory leaks and keeps the dependency graph minimal.
      </tracking-lifecycle>
      <flag-optimization>
        Bit flags enable efficient state queries through bitwise operations. The system can check dirty state, detect pending-only state, and identify writable dirty signals in single operations, avoiding multiple property accesses.
      </flag-optimization>
    </memory-optimization>
  </core-architecture>
  <synchronization-mechanisms>
    <batch-system>
      <batching-implementation>
        Batching increments a depth counter, executes the callback, then flushes when depth returns to zero. During batching, effects are queued but not executed, preventing intermediate runs. The system maintains effect execution order through proper queuing and ensures all batched updates complete atomically.
      </batching-implementation>
      <effect-scheduling>
        Effect scheduling adds effects to a queue with deduplication - effects already queued are skipped. Effects execute in dependency order during flushing, with nested dependencies processed recursively. The system tracks current execution position for proper ordering.
      </effect-scheduling>
    </batch-system>
    <change-detection>
      <deep-equality-algorithm>
        Deep equality comparison performs structural comparison for objects/arrays while using reference equality for primitives. Special handling for Maps/Sets, constructor comparison for type safety, and recursive traversal for nested structures. This enables automatic optimization where identical values don't trigger updates, reducing unnecessary propagation.
      </deep-equality-algorithm>
      <value-update-protocol>
        Value updating executes signal/computed functions, compares results with deep equality, and updates cached values only when different. For signals, base and cached values are synchronized. For computed values, cached values store results. Change detection drives the entire propagation system.
      </value-update-protocol>
    </change-detection>
    <context-management>
      <tracking-context>
        The system establishes reactive context using an execution stack. During execution, any signal reads create dependencies to this context. The stack enables nested computations and effects, with each level maintaining its own dependency tracking. This context-switching is critical for automatic dependency collection.
      </tracking-context>
      <untracked-execution>
        Untracked execution temporarily nulls the current reactive context, allowing signal reads without dependency creation. Essential for escape hatches, debugging, and scenarios where reactive relationships would create unwanted updates. Implementation preserves context stack integrity through proper save/restore.
      </untracked-execution>
    </context-management>
  </synchronization-mechanisms>
  <performance-characteristics>
    <computational-complexity>
      <dependency-operations>
        Link creation/removal: O(1) due to doubly-linked list structure. Dependency traversal: O(n) where n is dependency count, but typically small. Propagation: O(subscribers) per changed signal. Effect execution: O(effects) with topological ordering ensuring each effect runs exactly once per update cycle.
      </dependency-operations>
      <memory-patterns>
        Reactive nodes have fixed overhead: ~8 pointers + flags + values. Links add ~6 pointers each. Link recycling during tracking reduces allocation pressure. Automatic cleanup during tracking completion prevents memory leaks. Cache-friendly doubly-linked lists enable efficient traversal.
      </memory-patterns>
    </computational-complexity>
    <optimization-strategies>
      <diamond-problem-solution>
        The system prevents duplicate executions in diamond patterns through proper state management. Nodes transition F.C → F.P → F.D during propagation. Only dirty nodes trigger recomputation, and only when values actually change through deep equality checking. This ensures each computation runs exactly once per update cycle regardless of dependency graph complexity.
      </diamond-problem-solution>
      <topological-execution>
        Effects execute in dependency order through recursive processing. The algorithm processes dependencies depth-first, ensuring parent computations complete before child effects run. Scheduling flags prevent duplicate processing during recursive traversal.
      </topological-execution>
      <early-termination>
        When computed values return identical results through deep equality checking, propagation stops immediately. This optimization is crucial for derived values that normalize input variations or implement filters. Combined with lazy evaluation, it prevents cascading unnecessary updates.
      </early-termination>
    </optimization-strategies>
  </performance-characteristics>
  <edge-case-handling>
    <circular-dependency-prevention>
      <construction-phase>
        During reactive graph construction, temporary cycles may exist but are resolved through proper execution ordering. Computing flags prevent infinite recursion during computation execution. Self-referential effects are prevented through guarded flag checking.
      </construction-phase>
      <runtime-protection>
        Validation uses explicit stack management instead of recursion to handle deep dependency chains without stack overflow. The algorithm tracks depth and unwinds properly, handling complex nested validation scenarios that could otherwise cause infinite loops.
      </runtime-protection>
    </circular-dependency-prevention>
    <cleanup-and-disposal>
      <effect-cleanup>
        Effect disposal removes the effect from all dependency subscriber lists, clears its own dependency links, and marks it as disposed. This complete disconnection prevents memory leaks and ensures disposed effects never execute again. The cleanup process is atomic and safe to call multiple times.
      </effect-cleanup>
      <automatic-dependency-management>
        Each tracking cycle automatically removes stale dependencies during completion. Dependencies not accessed during execution are assumed stale and removed from the graph. This keeps the dependency graph minimal and prevents accumulation of unused relationships over time.
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
        Clean → Pending during propagation marking → Dirty when definitely stale → Computing during execution → Clean when complete. Tracking overlays during dependency collection. Writable flags distinguish signals from computed values. Guarded flags mark effects for execution scheduling.
      </state-transitions>
      <concurrent-state-handling>
        Multiple flags can be active simultaneously during computed execution with dependency tracking and during propagation phases. The system handles these combinations correctly through careful bit masking and state checks throughout the codebase.
      </concurrent-state-handling>
    </flag-state-machine>
    <execution-context-stack>
      <context-switching-protocol>
        The system maintains an execution context stack. Context management pushes new contexts and returns previous ones for restoration. This enables nested reactive execution: effects can contain computed values, which can read signals, each maintaining proper dependency relationships to their immediate context.
      </context-switching-protocol>
      <stack-integrity>
        Context stack must be properly managed even during exceptions. All execution paths use try/finally to ensure context restoration. Stack corruption would break dependency tracking, so this integrity is critical for system reliability.
      </stack-integrity>
    </execution-context-stack>
    <link-management-details>
      <bidirectional-linking>
        Each link maintains pointers for endpoints, subscriber chain navigation, and dependency chain navigation. This enables efficient insertion, removal, and traversal in both directions without additional data structures.
      </bidirectional-linking>
      <link-lifecycle>
        Links are created during dependency establishment, potentially reused during tracking, and removed during cleanup or disposal. The system handles both fresh allocation and reuse scenarios, while ensuring proper chain unlinking without breaking list integrity.
      </link-lifecycle>
    </link-management-details>
  </advanced-internals>
</technical-internals>