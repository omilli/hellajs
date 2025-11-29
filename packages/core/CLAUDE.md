# Core Package

High-performance reactive primitives using doubly-linked dependency graphs and topological execution.

## Architecture Overview

### Mental Model

The system is a directed acyclic graph where:
- **Nodes**: signals (sources), computed (transform), effects (sinks)
- **Edges**: dependency relationships via doubly-linked lists
- **Updates**: propagate through graph in topological order
- **Guarantees**: glitch-free (each node executes max once per update)

### Key Data Structures

**Reactive Base** (types.ts)
```typescript
rd?: Link     // First dependency (what this node depends on)
rpd?: Link    // Previous dependency pointer (tracking bookmark)
rs?: Link     // First subscriber (who depends on this node)
rps?: Link    // Previous subscriber pointer
rf: number    // Bitmask flags (state machine)
```

**SignalState** (types.ts)
```typescript
sbv: T        // Base value (last confirmed value)
sbc: T        // Current value (potentially uncommitted)
```

**ComputedState** (types.ts)
```typescript
cbc: T | undefined  // Cached computed value
cbf: (prev?: T) => T // Compute function
```

**EffectState** (types.ts)
```typescript
ef(): void    // Effect function to execute
```

**Link** (types.ts)
```typescript
ls: Reactive  // Source (what we depend on)
lt: Reactive  // Target (who depends on source)
lpd/lnd: Link // Doubly-linked list for dependencies
lps/lns: Link // Doubly-linked list for subscribers
```

### State Machine (internal/flags.ts)

```
Signal write:  WRITABLE → WRITABLE|DIRTY → WRITABLE (after executeSignal)
Computed read: WRITABLE|DIRTY → TRACKING → CLEAN (after executeComputed)
Effect run:    GUARDED|DIRTY → TRACKING → CLEAN (after executeEffect)
Propagation:   CLEAN → PENDING → DIRTY (when dependency changes)
```

**Flag Constants:**
- `CLEAN` (0): No pending updates
- `WRITABLE` (1): Writable signal marker
- `GUARDED` (2): Effect marker (prevents self-triggering)
- `TRACKING` (4): Currently tracking dependencies
- `COMPUTING` (8): Currently executing (cleared by startTracking)
- `DIRTY` (16): Definitely needs re-execution
- `PENDING` (32): Might need re-execution (validate first)
- `SCHEDULED` (128): Effect queued for execution (internal to scheduler)

## Key Algorithms

### propagateChange (internal/propagation.ts)

**Purpose**: Mark subscribers as PENDING, schedule effects for execution

**Strategy**: Manual stack for depth-first traversal with sibling tracking
- Start from first subscriber link
- Process WRITABLE signals depth-first (traverse their subscribers)
- Mark clean nodes as PENDING
- Schedule GUARDED nodes (effects) via scheduleEffect
- Use pooled stack frames for siblings to avoid allocations
- Skip already-processing nodes (TRACKING|COMPUTING|DIRTY|PENDING)

**Stack pooling**: Reuses `Stack<Link>` frames to minimize allocations in hot paths

### propagate (internal/propagation.ts)

**Purpose**: Upgrade PENDING nodes to DIRTY when source value confirmed changed

**Strategy**: Linear walk through subscriber list
- Only upgrades nodes that are PENDING but not DIRTY
- Schedules GUARDED effects for execution

### validateStale (internal/validation.ts)

**Purpose**: Determine if a PENDING node actually needs re-execution

**Strategy**: Recursive validation with stack pooling
- If source is WRITABLE|DIRTY: update it, check if value changed
- If source is WRITABLE|PENDING: recurse into its dependencies
- If value unchanged: clear PENDING flag (skip update)
- Stack-based unwinding with propagate calls for multi-subscriber sources

**Critical insight**: Enables "skip update" optimization when computed dependencies haven't actually changed

### Tracking System (internal/tracking.ts)

**Context Management** (internal/context.ts)
- `currentValue`: Currently executing reactive node (effect or computed)
- `setCurrentSub(sub)`: Sets reactive context, returns previous for restoration
- Signals/computed check `currentValue` to register dependencies via `createLink`
- `activeScope`: Currently active effect scope for batch cleanup
- `setActiveScope(scope)`: Sets scope context, returns previous
- `addScopeEffect(cleanup)`: Registers effect cleanup with active scope (lazy Set creation)

**startTracking**
- Reset `rpd` to undefined (fresh tracking bookmark)
- Clear COMPUTING|DIRTY|PENDING flags, set TRACKING flag
- Marks beginning of dependency collection

**endTracking**
- Remove dependencies after `rpd` (weren't accessed this run)
- Clear TRACKING flag
- Enables dynamic dependency graphs

**Link Reuse** (createLink in internal/links.ts)
- Check if `rpd.ls === source` to skip duplicate links
- During tracking: check `nextDep = rpd ? rpd.lnd : target.rd`
- If `nextDep.ls === source`: advance `rpd` and reuse existing link
- Otherwise: allocate from pool or create new link
- Avoids allocation churn in hot paths

## Performance Patterns

### Hot Path Optimizations

1. **Inline flag checks**: Bitwise ops, not function calls
2. **Link pooling**: `linkPool` reuses Link objects (createLink/removeLink)
3. **Stack pooling**: `stackPool` in propagation.ts and validation.ts
4. **Early exits**: Check flags before traversing subscribers
5. **Cached values**: Only recompute if dirty or pending-with-stale-deps
6. **Deep equality**: Skip propagation when value unchanged

### Memory Management

- Computed nodes auto-GC when last subscriber removed (removeLink checks `!lps && !ls.rs`)
- Links returned to pool on removal
- Effect queue compacts when oversized (>64 slots and >4x current count)
- Dependency lists reuse links during tracking

## Scheduler System (internal/scheduler.ts)

**Purpose**: Batch and execute effects in dependency order

**Implementation**:
- `effectQueue[]`: Array of scheduled effects
- `SCHEDULED` (128): Local flag preventing double-queuing
- `scheduleEffect()`: Adds effect to queue if not SCHEDULED
- `flush()`: Processes queue, executing effects in order
- `executeEffect()`: Validates staleness, runs effect with tracking

**executeEffect algorithm**:
- If DIRTY or (PENDING && validateStale): execute effect function
- Set reactive context, start/end tracking for fresh dependencies
- If just PENDING (not stale): clear PENDING flag
- Recursively execute scheduled dependencies in dependency order

## Batching System (batch.ts)

**Purpose**: Defer effect execution until all related signal updates complete

**Implementation**:
- `batchDepth` counter tracks nesting level (exported for signal.ts)
- Signals check `batchDepth` before calling `flush()`
- Only outermost batch triggers flush on exit (`if (!--batchDepth) flush()`)

**Benefits**:
- Prevents redundant effect executions
- Ensures effects see consistent state
- Supports nested batching naturally

## Scope System (scope.ts)

**Purpose**: Collect and batch-dispose effects for lifecycle management

**Implementation**:
- `scope(fn)` creates `EffectScope` with lazy `effects` Set
- Sets itself as `activeScope` during `fn` execution
- `effect()` calls `addScopeEffect(cleanup)` to register
- Returns cleanup that calls all registered cleanups (or shared NOOP if no effects)

**Benefits**:
- Component-level lifecycle management
- Batch cleanup of multiple effects
- Zero overhead when no scope active (undefined check)
- Zero overhead when scope has no effects (shared NOOP)

## Non-Obvious Behaviors

- **Signal getter triggers propagate**: When dirty, `executeSignal` commits value, then `propagate(rs)` upgrades PENDING→DIRTY
- **Computed initializes WRITABLE|DIRTY**: Starts dirty, `WRITABLE` used for polymorphic dispatch in `updateValue`
- **Effects link to parent effects**: `currentValue && createLink(effectState, currentValue)` creates effect hierarchy
- **rpd is tracking bookmark**: Last accessed dependency during tracking, not last dependency in list
- **SCHEDULED flag is local**: Defined in scheduler.ts (128), not in flags.ts, prevents double-queuing
- **Batch depth zero triggers flush**: Decrement check `!--batchDepth` flushes when reaching zero
- **removeLink auto-GCs computed**: When `!lps && !ls.rs` (no subscribers), recursively removes computed's dependencies
- **executeEffect processes nested scheduled**: After running, walks dependencies executing any SCHEDULED ones
- **Reference equality for updates**: Uses `!==` like Preact/Alien Signals - new object instances always trigger updates