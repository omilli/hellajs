---
applyTo: "**"
---

# Script Instructions

Follow these instructions when working in this monorepo sub-folder. @hellajs/core is the foundational reactive system.

## Structure
- `signal.ts` - Signal primitive implementation with dependency tracking
- `effect.ts` - Effect system for managing reactive side-effects
- `computed.ts` - Computed values derived from reactive signals
- `batch.ts` - Batching system for optimizing multiple updates
- `untracked.ts` - Utility for non-reactive code execution
- `tracking.ts` - Core dependency tracking utilities
- `reactive.ts` - Main reactive system orchestration
- `types.ts` - TypeScript type definitions and interfaces

## Approach

### Graph-Based Dependency Tracking
- Reactive nodes form a directed acyclic graph (DAG) using doubly-linked lists
- Each reactive node has `deps` (dependencies) and `subs` (subscribers) links
- Links connect sources to targets bidirectionally for efficient traversal and cleanup
- Automatic garbage collection when computed values lose all subscribers

### Flag-Based State Management
- Bitwise flags track node state: Clean (0), Writable (1), Guarded (2), Tracking (4), Computing (8), Dirty (16), Pending (32)
- State changes propagated through graph using flag combinations
- Minimal state checks optimize performance during updates

### Lazy Evaluation with Staleness Validation
- Computed values only recalculate when accessed and dependencies changed
- `validateStale()` traverses dependency chain to check if recomputation needed
- Topological ordering ensures consistent evaluation: signals → computeds → effects

### Batched Effect Scheduling
- Signal updates mark dependent nodes as dirty but defer effect execution
- Effects queued and processed synchronously after all signal updates complete
- Batch depth counter prevents effect execution during nested batch operations

### Global Tracking Context
- `currentValue` global tracks the currently executing reactive computation
- Dependency links created automatically when signals accessed during tracking
- Context switched during effect/computed execution for proper dependency capture