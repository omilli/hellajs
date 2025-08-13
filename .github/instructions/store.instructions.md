---
applyTo: "packages/store/**"
---

# Store Instructions

Follow these instructions when working in this monorepo sub-folder. @hellajs/store is the reactive state management system built on @hellajs/core primitives.

## Structure
- `store.ts` - Main store factory function and nested store orchestration
- `types.ts` - Complex type system for deeply reactive object mapping and readonly controls
- `index.ts` - Public API exports for the package

## Approach

### Object-to-Signal Transformation
- Plain objects recursively transformed into reactive proxy structures
- Each property becomes either a Signal (for primitives/arrays) or nested Store (for objects)
- Functions in initial object preserved as-is without signal wrapping
- Property descriptors maintained with enumerable, configurable flags for proper iteration

### Selective Readonly Signal Mapping
- ReadonlySignal vs Signal determined at creation time based on options
- Type-level readonly enforcement using conditional types and template literal unions
- Readonly properties wrapped in `computed()` to prevent external writes while maintaining reactivity
- Flexible readonly modes: entire store, specific keys array, or fully mutable

### Deep Nested Reactivity
- Recursive store creation for nested plain objects maintains reactivity at all levels
- Each nested object becomes independent Store instance with own cleanup lifecycle
- Nested store updates propagate through `update()` method delegation
- Object detection via `isPlainObject()` excludes arrays, null, and non-plain objects

### Partial Deep Update System
- `PartialDeep<T>` utility type enables optional nested property updates
- `write()` function handles mixed update scenarios: nested stores vs direct signals
- Update delegation preserves type safety and handles arbitrary nesting depth
- Partial updates merge into existing state without replacing entire object trees

### Reserved Key Namespace Protection
- System methods (`computed`, `set`, `update`, `cleanup`) protected from property conflicts
- Reserved keys explicitly excluded from iteration and transformation
- Namespace collision handled gracefully with method precedence over data properties

### Memory Management and Cleanup
- Recursive cleanup traverses entire store tree to dispose all signal dependencies
- Each store instance maintains independent cleanup responsibility
- Deep cleanup prevents memory leaks in complex nested store hierarchies
- Automatic signal disposal when stores are explicitly cleaned up

### Type-Safe Store Interface
- `NestedStore<T, R>` maps object structure to reactive equivalents with readonly constraints
- Complex conditional type mapping preserves exact type structure and function signatures
- `Store<T, R>` adds lifecycle methods while maintaining structural integrity
- Overloaded function signatures provide different readonly type enforcement patterns