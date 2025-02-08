# Store API Reference

State management with computed properties and effects.

## Index

- [store(factory, options)](#storefactory-options)
  - [Parameters](#parameters)
  - [Methods](#methods)
  - [Examples](#examples)

## store(factory, options)

Creates a reactive store with computed state and methods.

### Parameters

- `factory`: Function that receives store signals and returns store definition
- `options`: Optional configuration object
  ```typescript
  interface StoreOptions {
    readonly?: boolean | string[];
  }
  ```

### Methods

- `set(update)`: Batch update store properties
- `effect(fn)`: Register store-scoped effect
- `subscribe(callback)`: Subscribe to store changes
- `cleanup()`: Dispose store resources

### Examples

```typescript
// Basic store
const counter = store((state) => ({
  count: 0,
  increment: () => state.count.set(state.count() + 1),
  decrement: () => state.count.set(state.count() - 1),
}));

counter.count(); // read: 0
counter.increment(); // count: 1

// With computed properties
const cart = store((state) => ({
  items: [],
  total: () => state.items().reduce((sum, item) => sum + item.price, 0),
  addItem: (item) => state.items.set([...state.items(), item]),
}));

// With readonly properties
const settings = store(
  (state) => ({
    theme: "light",
    version: "1.0.0",
  }),
  {
    readonly: ["version"], // or true for all properties
  }
);

settings.theme.set("dark"); // works
settings.version.set("2.0.0"); // warning: Cannot modify readonly property

// Batch updates
cart.set((state) => ({
  items: [...state.items(), newItem],
  total: state.total() + newItem.price,
}));

// Store effects
cart.effect(() => {
  console.log("Cart total:", cart.total());
});

// Subscribe to store changes
const unsubscribe = cart.subscribe((state, prev) => {
  console.log("Cart updated:", state);
  console.log("Previous state:", prev);
});

// Watch specific properties
cart.subscribe((state, prev) => {
  if (state.total !== prev.total) {
    console.log("Total changed:", state.total);
  }
});

// Cleanup subscription
unsubscribe();
```
