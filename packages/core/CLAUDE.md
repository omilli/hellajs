# Core Package

High-performance reactive primitives using doubly-linked dependency graphs and topological execution.

## Folder Structure

```
lib/
├── index.ts                    # Public API exports
├── types.ts                    # Core type definitions
├── internal/                   # Internal implementation modules
│   ├── context.ts             # Reactive context management
│   ├── equals.ts              # Deep equality comparisons
│   ├── execution.ts           # Signal/computed execution
│   ├── flags.ts               # State machine flag constants
│   ├── links.ts               # Doubly-linked list operations
│   ├── propagation.ts         # Change propagation algorithms
│   ├── scheduler.ts           # Effect scheduling and flushing
│   ├── tracking.ts            # Dependency tracking
│   └── validation.ts          # Staleness validation
└── primitives/                 # Public reactive primitives
    ├── batch.ts               # Batched updates
    ├── computed.ts            # Derived reactive values
    ├── effect.ts              # Side effects
    ├── signal.ts              # Reactive state containers
    └── untracked.ts           # Untracked execution
```

## Architecture Overview

### Mental Model

The system is a directed acyclic graph where:
- **Nodes**: signals (sources), computed (transform), effects (sinks)
- **Edges**: dependency relationships via doubly-linked lists
- **Updates**: propagate through graph in topological order
- **Guarantees**: glitch-free (each node executes max once per update)

### Key Data Structures

**Reactive Node** (types.ts)
```typescript
rd: Link      // First dependency (what this node depends on)
rpd: Link     // Previous dependency pointer (tracking bookmark)
rs: Link      // First subscriber (who depends on this node)
rps: Link     // Previous subscriber pointer
rf: number    // Bitmask flags (state machine)
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
CLEAN (0) → PENDING (32) → DIRTY (16) → COMPUTING (8) → CLEAN (0)
                ↑                              ↓
                └──────── TRACKING (4) ────────┘
```

**Flag Combinations:**
- `WRITABLE|DIRTY` (17): Writable signal that changed
- `WRITABLE|DIRTY|PENDING` (49): Might be dirty, validate needed
- `GUARDED|DIRTY` (18): Effect ready to execute
- `TRACKING` (4): Currently tracking dependencies
- `COMPUTING` (8): Currently computing/executing (eMit)

## Key Algorithms

### propagateChange (internal/propagation.ts)

**Purpose**: Depth-first traversal marking nodes as PENDING, scheduling effects

**Strategy**: Manual stack to avoid recursion limits
- Process subscribers depth-first
- Mark clean nodes as PENDING
- Schedule effects with GUARDED flag
- Stack siblings for breadth coverage

**Why depth-first**: Ensures topological order for effect execution

### validateStale (internal/validation.ts)

**Purpose**: Determine if a PENDING node actually needs re-execution

**Strategy**: Recursively validate dependency chain
- If dependency is dirty, update it and check if value changed
- If dependency is pending, recurse into its dependencies
- Short-circuit if value unchanged (glitch prevention)

**Critical insight**: This is what enables the "skip update" optimization in topology tests

### Tracking System (internal/tracking.ts)

**Context Management** (internal/context.ts)
- `currentValue` holds the currently executing reactive node (effect or computed)
- `setCurrentSub()` sets the reactive context for dependency tracking
- When signals/computed are read, they check `currentValue` to register dependencies

**startTracking**
- Reset `rpd` to undefined (start fresh)
- Clear COMPUTING|DIRTY|PENDING flags, set TRACKING flag
- Marks beginning of dependency collection

**endTracking**
- Remove dependencies after `rpd` (weren't accessed this run)
- Clear TRACKING flag
- Enables dynamic dependencies

**Link Reuse** (createLink in internal/links.ts)
- During tracking, reuse existing links if source matches
- Avoids allocation churn in hot paths
- `rpd` advances as dependencies are accessed

## Performance Patterns

### Hot Path Optimizations

1. **Inline flag checks**: Use bitwise ops, not function calls
2. **Link reuse**: createLink checks existing before allocating
3. **Early exits**: Check flags before traversing subscribers in signal getter
4. **Cached values**: Only recompute if dirty or pending-with-stale-deps
5. **Manual stacks**: Avoid recursion in propagateChange

### Memory Management

- Computed nodes auto-GC when last subscriber removed (removeLink in internal/links.ts)
- Links form intrusive data structures (no wrapper objects)
- Effect queue reuses array slots in flush (internal/scheduler.ts)
- Dependency lists reuse links during tracking

## Batching System (primitives/batch.ts)

**Purpose**: Defer effect execution until all related signal updates complete

**Implementation**:
- `batchDepth` counter tracks nesting level
- Signals check `batchDepth` before calling `flush()`
- Only outermost batch triggers flush on exit
- Allows multiple updates without intermediate effect runs

**Benefits**:
- Prevents redundant effect executions
- Ensures effects see consistent state
- Supports nested batching naturally

## Non-Obvious Behaviors

- **Signals propagate even when DIRTY flag set**: executeSignal called on every read if dirty
- **Computed caches undefined**: `cbc` can be undefined, valid cached value
- **Effects are subscribers AND can have dependencies**: dual role in graph - createLink accepts effects
- **rpd is NOT the last dependency**: It's the last *accessed* dependency during tracking
- **SCHEDULED flag is local constant**: Not in flags.ts, defined in internal/scheduler.ts to prevent double-queueing
- **Batch depth of 0 triggers flush**: Zero-based, flush on transition to 0
- **currentValue enables automatic dependency tracking**: Set during effect/computed execution, read by signals