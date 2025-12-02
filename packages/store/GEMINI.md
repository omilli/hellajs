# Store Package

Deeply reactive state management through automatic conversion of plain objects into granular reactive primitives.

## Architecture Overview

### Mental Model

The system transforms plain objects into **surgically reactive stores**:
- **Primitives**: Become signals (writable reactive values)
- **Objects**: Recursively become nested stores
- **Arrays**: Become signals containing the array
- **Functions**: Preserved as-is (utility methods)
- **Readonly**: Specific properties wrapped in computed for read-only access

### Key Components

- **store.ts**: Core store factory, recursive transformation, update/set/cleanup methods
- **types.ts**: TypeScript type mappings, conditional readonly inference

## Key Data Structures

**Store Type Mapping**
```typescript
Store<T, R> = {
  [K in keyof T]:
    T[K] extends Function ? T[K]                    // Functions preserved
    : T[K] extends Array ? Signal<T[K]>             // Arrays become signals
    : T[K] extends Object ? Store<T[K], R>          // Objects recurse
    : K extends R ? () => T[K] : Signal<T[K]>       // Readonly vs writable
} & {
  snapshot: () => T                                  // Reactive plain object
  set: (value: T) => void                           // Full replacement
  update: (partial: PartialDeep<T>) => void         // Partial deep merge
  cleanup: () => void                                // Recursive disposal
}
```

**Reserved Keys**
- Set of property names that cannot exist in initial objects: `["computed", "snapshot", "set", "update", "cleanup"]`
- Checked during snapshot generation and cleanup traversal

## Key Algorithms

### Recursive Store Initialization

**Purpose**: Transform plain object into nested reactive structure

**Strategy**: Loop Object.entries, handle each value type
1. **Function**: Preserve via defineStoreProperty
2. **Plain object**: Recursively call store() to create nested store
3. **Primitive/Array**: Create signal, wrap in computed if readonly
4. **Readonly check**: `readonlyAll || readonlyKeys.includes(key)`

**Critical insight**: Readonly properties are signals wrapped in computed(() => sig()), preventing writes while maintaining getter syntax

### set() Method - Full State Replacement

**Purpose**: Replace entire store state while preserving structure

**Strategy**: Iterate initial object keys (not newValue keys)
- Skip keys not in newValue
- If current is nested store and value is plain object → call nested store's update()
- Otherwise → applyUpdate(current, value) to set signal directly

**Why initial keys**: Prevents adding new properties, only updates existing structure

### update() Method - Partial Deep Merge

**Purpose**: Surgically update deeply nested properties

**Strategy**: Iterate partial object entries
- If value is plain object AND current has 'update' method → recurse via update()
- Otherwise → applyUpdate(current, value)

**Difference from set()**: Loops partial keys (not initial keys), only updates provided properties

### snapshot Computed

**Purpose**: Reactive plain object representation of entire state

**Strategy**: Iterate all non-reserved keys
1. If value is function and original was function → preserve original
2. If value has snapshot method (nested store) → call value.snapshot()
3. Otherwise → call value() to get signal value

**Reactivity**: Computed re-runs when ANY accessed signal changes, flattening reactive tree to plain object

### cleanup() Recursive Disposal

**Purpose**: Prevent memory leaks by disposing all reactive subscriptions

**Strategy**: Recursive deepCleanup traversal
- Skip reserved keys
- If property has cleanup function → call it
- If property is object → recurse into it
- Guard with isObjectOrFunction to skip primitives

**Critical**: Ensures nested stores and their signals are fully disposed

## Performance Patterns

### Hot Path Optimizations

1. **reservedKeys as Set**: O(1) lookup vs array.includes O(n)
2. **Type guards**: typeof checks are JIT-optimized
3. **defineStoreProperty**: Reusable helper reduces code duplication
4. **Lazy snapshot**: Computed only runs when accessed, not on every change
5. **Direct property access**: No proxy overhead, properties are actual signals/stores

### Memory Management

- Recursive cleanup traverses entire tree
- Store structure created once, properties reused
- Readonly wraps signals in computed (small overhead) vs preventing writes at runtime
- No intermediate objects during updates (applyUpdate calls signals directly)

### Initialization Cost vs Update Efficiency

**Tradeoff**: Recursive store creation has upfront cost but enables:
- Granular reactivity (only changed signals notify)
- No diffing overhead (signals know their subscribers)
- Type-safe access (properties are actual signals, not proxy traps)

## Non-Obvious Behaviors

- **update() ignores new keys**: Only updates keys present in initial object, silently skips others
- **set() requires all keys**: Iterates initial keys, skips if not in newValue (partial replacement allowed)
- **Nested object detection**: Uses isPlainObject (excludes arrays, null, functions) to determine recursion
- **applyUpdate on undefined**: Early return if target undefined (prevents errors on missing keys)
- **Functions in snapshot**: Preserved from original, not from store (original !== store property for functions)
- **computed deprecated**: Both snapshot and computed reference same snapshotComputed signal
- **Readonly enforcement**: Happens at creation (computed wrap), not at runtime (no setter checks)
- **Array handling**: Arrays become signals, not stores (no per-element reactivity)
- **null/undefined primitives**: Become signals like any primitive value
- **defineStoreProperty writable: true**: Allows store properties to be reassigned (loses reactivity if overwritten)
- **Cleanup doesn't null properties**: Just calls cleanup on nested values, properties remain accessible
- **Recursive store() call**: Nested stores have no readonly inheritance (each level independent)
- **isPlainObject in set/update**: Determines deep merge vs direct assignment, critical for nested stores
