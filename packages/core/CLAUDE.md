# @hellajs/core Instructions

Follow these instructions when working on the Core package. @hellajs/core provides the foundational reactive system with high-performance signals, computed values, effects, and batching.

## Quick Reference

### Key Files
- `lib/signal.ts` - Core signal primitive with dependency tracking
- `lib/effect.ts` - Effect system for reactive side-effects
- `lib/computed.ts` - Computed values derived from signals
- `lib/batch.ts` - Batching system for optimized updates
- `lib/untracked.ts` - Utility for non-reactive code execution
- `lib/tracking.ts` - Dependency tracking and validation utilities
- `lib/reactive.ts` - Core reactive system orchestration
- `lib/links.ts` - Doubly-linked list implementation for graph connections
- `lib/types.ts` - TypeScript definitions and flag constants
- `lib/index.ts` - Public API exports

## Architecture

### Core Design Principles
1. **Performance**: Zero-overhead abstractions with efficient dependency tracking
2. **Memory Efficiency**: Automatic cleanup and garbage collection
3. **Predictable Execution**: Topological ordering and batched updates
4. **Type Safety**: Full TypeScript support with precise type inference
5. **Developer Experience**: Simple API with powerful reactive capabilities

### Reactive System Foundation

#### Signal Primitive (`signal`)
```typescript
function signal<T>(initialValue: T): Signal<T>
function signal<T>(): Signal<T | undefined>
```

**Features**:
- Fundamental reactive primitive for state management
- Automatic dependency tracking when accessed inside reactive contexts
- Change detection with efficient propagation to subscribers
- Dual getter/setter interface with type-safe value handling

**Core Behavior**:
- **Getter**: Returns current value and establishes dependency links
- **Setter**: Updates value and marks dependent computeds/effects as dirty
- **Change Detection**: Only propagates when value actually changes
- **Batching Integration**: Defers effect execution during batch operations

#### Effect System (`effect`)
```typescript
function effect(fn: () => void): () => void
```

**Features**:
- Executes side-effect functions reactively
- Automatic re-execution when dependencies change
- Proper cleanup and disposal mechanisms
- Nested effect support with parent-child relationships

**Lifecycle**:
1. **Setup**: Establishes reactive context and tracks dependencies
2. **Execution**: Runs effect function with dependency tracking
3. **Re-execution**: Triggered by dependency changes
4. **Cleanup**: Disposer function removes all reactive connections

#### Computed Values (`computed`)
```typescript
function computed<T>(getter: (previousValue?: T) => T): () => T
```

**Features**:
- Lazy evaluation with automatic caching
- Dependency invalidation and re-computation
- Access to previous value for optimization
- Automatic garbage collection when unused

**Optimization Strategy**:
- **Lazy Computation**: Only recalculates when accessed and dependencies changed
- **Stale Validation**: Traverses dependency chain to check recomputation necessity
- **Caching**: Stores computed result until dependencies invalidate
- **Memory Management**: Automatic cleanup when no subscribers remain

#### Batch Operations (`batch`)
```typescript
function batch<T>(fn: () => T): T
```

**Features**:
- Groups multiple signal updates into single synchronous operation
- Defers effect execution until batch completion
- Nested batching support with depth tracking
- Performance optimization for bulk updates

**Execution Model**:
1. **Batch Start**: Increment depth counter to defer effects
2. **Signal Updates**: Mark dependencies as dirty without executing effects
3. **Batch End**: Process all queued effects synchronously
4. **Nested Handling**: Only execute effects when exiting outermost batch

### State Management System

#### Flag-Based State Tracking
Located in `types.ts`:
- `F.W` (1) - Writable: Can be updated
- `F.G` (2) - Guarded: Protected from disposal
- `F.T` (4) - Tracking: Currently tracking dependencies
- `F.C` (8) - Computing: In computation phase
- `F.D` (16) - Dirty: Needs recomputation
- `F.P` (32) - Pending: May need recomputation

#### Dependency Graph Management
- **Doubly-Linked Lists**: Efficient bidirectional connections
- **DAG Structure**: Directed acyclic graph prevents circular dependencies
- **Automatic Cleanup**: Removes unused nodes and connections
- **Topological Ordering**: Ensures consistent evaluation order

#### Memory Management
- **Reference Counting**: Tracks active subscribers for cleanup
- **Weak References**: Allows garbage collection of unused computeds
- **Link Management**: Efficient creation and removal of dependencies
- **Disposal System**: Proper cleanup of effects and computeds

### Performance Optimizations

#### Dependency Tracking
```typescript
// tracking.ts - Core tracking utilities
export let currentValue: Reactive | undefined;
export function setCurrentSub<T>(sub: T): T | undefined;
export function createLink(source: Reactive, target: Reactive): void;
```

**Features**:
- Global tracking context for automatic dependency capture
- Efficient link creation and management
- Minimal overhead during reactive execution
- Smart cleanup of stale dependencies

#### Stale Validation System
```typescript
// Validates if computed needs recomputation by checking dependency chain
function validateStale(deps: Link, computed: ComputedBase<any>): boolean
```

**Process**:
1. **Traverse Dependencies**: Walk dependency chain checking for changes
2. **Early Termination**: Stop at first dirty dependency found
3. **Flag Management**: Update pending/dirty flags appropriately
4. **Cycle Prevention**: Handle complex dependency graphs safely

#### Execution Pipeline
1. **Signal Updates**: Mark dependents as dirty, batch if needed
2. **Computed Evaluation**: Lazy recomputation on access
3. **Effect Scheduling**: Queue effects for synchronous execution
4. **Batch Processing**: Execute all queued effects together

## Implementation Details

### Signal Implementation
```typescript
// signal.ts:20-59 - Core signal function
const signalValue: SignalBase<T> = {
  lastVal: initialValue,
  currentVal: initialValue,
  subs: undefined,      // Subscribers (dependents)
  prevSub: undefined,   // Doubly-linked list navigation
  deps: undefined,      // Dependencies (not used for signals)
  prevDep: undefined,
  flags: F.W,       // Writable flag
};
```

**Key Mechanisms**:
- **Change Detection**: `currentVal !== (signalValue.currentVal = value!)`
- **Dependency Tracking**: Creates links when accessed in reactive context
- **Propagation**: Notifies subscribers through doubly-linked list traversal
- **Batching Integration**: Defers effect processing during batches

### Effect Implementation
```typescript
// effect.ts:9-33 - Effect creation and execution
const effectValue: EffectValue = {
  execFn: fn,
  flags: F.G,       // Guarded against disposal
  // ... other reactive properties
};
```

**Execution Flow**:
1. **Context Setup**: Set as current reactive context
2. **Dependency Capture**: Automatically track accessed signals
3. **Effect Execution**: Run user function with tracking active
4. **Context Restore**: Restore previous reactive context

### Computed Implementation
```typescript
// computed.ts:10-39 - Computed value creation
const computedValue: ComputedBase<T> = {
  cachedVal: undefined,
  flags: F.W | F.D,  // Writable and initially dirty
  compFn: getter,
  // ... other reactive properties
};
```

**Evaluation Strategy**:
- **Lazy Evaluation**: Only compute when accessed and dirty
- **Stale Validation**: Check dependency chain for actual changes
- **Previous Value**: Pass to getter for optimization opportunities
- **Propagation**: Notify dependents after successful computation

## Development Guidelines

### Adding New Reactive Primitives
1. **Understand Graph Structure**: Review `links.ts` and `tracking.ts`
2. **Follow Flag Patterns**: Use existing flag system for state management
3. **Implement Cleanup**: Ensure proper disposal and memory management
4. **Add Type Definitions**: Update `types.ts` with new interfaces
5. **Test Extensively**: Include performance, memory, and edge case tests

### Performance Considerations
- Use flags for efficient state checks
- Minimize dependency tracking overhead
- Leverage batching for bulk operations
- Implement proper cleanup to prevent memory leaks
- Profile with realistic usage patterns

### Common Patterns
```typescript
// ✅ Signal usage
const count = signal(0);
const increment = () => count(count() + 1);

// ✅ Computed derived state
const doubled = computed(() => count() * 2);
const isEven = computed(() => count() % 2 === 0);

// ✅ Effects for side effects
effect(() => {
  console.log(`Count is now: ${count()}`);
});

// ✅ Batching for performance
batch(() => {
  count(1);
  count(2);
  count(3);
  // Effects run once at batch end
});

// ✅ Cleanup
const dispose = effect(() => {
  // ... reactive code
});
dispose(); // Clean up when done
```

### API Consistency Rules
- All reactive primitives participate in dependency tracking
- Consistent disposal patterns across all reactive values
- TypeScript support with precise type inference
- Predictable execution order (signals → computeds → effects)
- Memory safety through automatic cleanup

## Integration Patterns

### With Other Packages
- **@hellajs/css**: Reactive style updates based on signal changes
- **@hellajs/dom**: Automatic DOM updates when signals change
- **@hellajs/store**: Higher-level state management built on signals
- **@hellajs/router**: Reactive route matching and navigation

### Advanced Usage
```typescript
// Conditional effects
effect(() => {
  if (isEnabled()) {
    // This effect only runs when isEnabled() is true
    performSideEffect();
  }
});

// Computed with previous value optimization
const runningTotal = computed((prev = 0) => {
  const current = getValue();
  return current > 0 ? prev + current : 0;
});

// Nested effects with cleanup
effect(() => {
  const childDispose = effect(() => {
    // Child effect automatically cleaned up when parent re-runs
  });
});

// Untracked access to prevent dependency
import { untracked } from '@hellajs/core';
effect(() => {
  const tracked = signal1(); // Creates dependency
  const untracked = untracked(() => signal2()); // No dependency
});
```

### Error Handling
- Effects that throw are automatically disposed
- Computed values cache exceptions and re-throw
- Signal updates are atomic (all or nothing)
- Batch operations maintain consistency even with errors