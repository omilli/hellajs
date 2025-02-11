# Store API Reference

## Table of Contents

- [Overview](#overview)
  - [Features](#features)
  - [Store Types](#store-types)
- [API](#api)
  - [store](#store)
  - [Examples](#examples)
- [Technical Details](#technical-details)
  - [State Management](#state-management)
  - [Computed Properties](#computed-properties)
  - [Actions](#actions)
  - [Performance](#performance)
  - [Security](#security)

## Overview

The store system provides centralized state management with computed properties, actions, and automatic dependency tracking. It integrates deeply with Hella's reactive primitives while maintaining high performance and type safety.

### Features

- Centralized state management
- Computed properties
- Action handlers
- Automatic tracking
- TypeScript support
- DevTools integration

### Store Types

```typescript
interface StoreOptions {
  readonly?: boolean | Array<string | number | symbol>; // Read-only properties
}

interface StoreBase<T> {
  signals: Map<keyof T, Signal<any>>;
  methods: Map<keyof T, Function>;
  effects: Set<() => void>;
  isDisposed: boolean;
  isInternal: boolean;
}

type StoreSignals<T> = {
  [K in keyof StoreState<T>]: Signal<StoreState<T>[K]>;
} & StoreMethods<T> & {
    set(
      update:
        | Partial<StoreState<T>>
        | ((store: StoreSignals<T>) => Partial<StoreState<T>>)
    ): void;
    cleanup(): void;
    computed(): StoreComputed<T>;
  };
```

## API

### store(factory, options?)

Creates a reactive store with state, computed values and methods.

#### Parameters

- `factory`: Function that receives signal state and returns store definition
- `options`: Optional StoreOptions object

#### Returns

Store instance with signals and methods

### Examples

```typescript
// Basic counter store
const counter = store(() => ({
  count: 0,
  increment() {
    this.count.set(this.count() + 1);
  },
  decrement() {
    this.count.set(this.count() - 1);
  },
  reset() {
    this.count.set(0);
  },
}));

// Usage
counter.count(); // read: 0
counter.increment(); // count: 1
counter.reset(); // count: 0

// With computed values
const todos = store(() => {
  const items = signal([]);

  return {
    items,
    active: () => items().filter((todo) => !todo.completed),
    completed: () => items().filter((todo) => todo.completed),
    add(text: string) {
      items.set([...items(), { text, completed: false }]);
    },
    toggle(index: number) {
      const updated = [...items()];
      updated[index].completed = !updated[index].completed;
      items.set(updated);
    },
  };
});

// Batch updates
todos.set((state) => ({
  items: [...state.items(), newTodo],
}));

// Read computed values
console.log(todos.active().length);
console.log(todos.completed().length);

// With readonly properties
const settings = store(
  () => ({
    theme: "light",
    version: "1.0.0",
  }),
  {
    readonly: ["version"],
  }
);

settings.theme.set("dark"); // Works
settings.version.set("2.0.0"); // Warning: Cannot modify readonly property

// Store cleanup
todos.cleanup(); // Dispose store and all signals
```

### Store Lifecycle

1. **Creation**

   ```typescript
   // Store initialization
   const store = store(() => {
     // Setup signals and state
     const count = signal(0);

     // Return store definition
     return {
       count,
       increment() {
         count.set(count() + 1);
       },
     };
   });
   ```

2. **Updates**

   ```typescript
   // Individual updates
   store.count.set(5);

   // Batch updates
   store.set((state) => ({
     count: state.count() + 1,
   }));
   ```

3. **Disposal**

   ```typescript
   // Cleanup all resources
   store.cleanup();

   // Store is now disposed
   store.count.set(0); // Warning: Attempting to update disposed store
   ```

## Technical Details

### State Management

```typescript
// Direct signal updates
store.count.set(5);

// Batch updates
store.set((state) => ({
  count: state.count() + 1,
  active: false,
}));

// Method updates
store.increment();
```

### Computed Properties

```typescript
const cart = store(() => {
  const items = signal([]);

  return {
    items,
    total: () => items().reduce((sum, item) => sum + item.price, 0),
    itemCount: () => items().length,
    addItem(item) {
      items.set([...items(), item]);
    },
  };
});
```

### Security

1. **State Protection**

   - Read-only properties
   - Type validation
   - Disposal checks
   - Internal state protection

2. **Access Control**
   ```typescript
   const secure = store(
     () => ({
       user: "admin",
       role: "admin",
     }),
     {
       readonly: ["role"], // Prevent role modification
     }
   );
   ```

### Performance

1. **Change Detection**

   - Signal-based reactivity
   - Computed value caching
   - Batched updates
   - Automatic cleanup

2. **Memory Management**
   - WeakMap store references
   - Automatic signal disposal
   - Effect cleanup
   - Resource tracking
