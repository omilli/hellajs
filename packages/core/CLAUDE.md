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

### State Machine (flags.ts)

```
Clean (0) → Pending (32) → Dirty (16) → Computing (8) → Clean (0)
                ↑                              ↓
                └──────── Tracking (4) ────────┘
```

**Flag Combinations:**
- `W|D` (17): Writable signal that changed
- `W|D|P` (49): Might be dirty, validate needed
- `G|D` (18): Effect ready to execute
- `T` (4): Currently tracking dependencies

## Key Algorithms

### propagateChange (reactive.ts)

**Purpose**: Depth-first traversal marking nodes as PENDING, scheduling effects

**Strategy**: Manual stack to avoid recursion limits
- Process subscribers depth-first
- Mark clean nodes as PENDING
- Schedule effects with GUARDED flag
- Stack siblings for breadth coverage

**Why depth-first**: Ensures topological order for effect execution

### validateStale (reactive.ts)

**Purpose**: Determine if a PENDING node actually needs re-execution

**Strategy**: Recursively validate dependency chain
- If dependency is dirty, update it and check if value changed
- If dependency is pending, recurse into its dependencies
- Short-circuit if value unchanged (glitch prevention)

**Critical insight**: This is what enables the "skip update" optimization in topology tests

### Tracking System (tracking.ts)

**startTracking**
- Reset `rpd` to undefined (start fresh)
- Clear M|D|P flags, set T flag
- Marks beginning of dependency collection

**endTracking**
- Remove dependencies after `rpd` (weren't accessed this run)
- Clear T flag
- Enables dynamic dependencies

**Link Reuse** (createLink in links.ts)
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

- Computed nodes auto-GC when last subscriber removed (removeLink)
- Links form intrusive data structures (no wrapper objects)
- Effect queue reuses array slots in flush
- Dependency lists reuse links during tracking

## Non-Obvious Behaviors

- **Signals propagate even when dirty flag set**: executeSignal called on every read if dirty
- **Computed caches undefined**: `cbc` can be undefined, valid cached value
- **Effects are subscribers AND can have dependencies**: dual role in graph - createLink accepts effects
- **rpd is NOT the last dependency**: It's the last *accessed* dependency during tracking
- **SCHEDULED flag is local constant**: Not in FLAGS enum, prevents double-queueing in scheduleEffect
- **Batch depth of 0 triggers flush**: Zero-based, flush on transition to 0