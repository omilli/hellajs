# Store API Reference

State management with computed properties and effects.

## Index

- [store(factory, options)](#storefactory-options)
  - [Parameters](#parameters)
  - [Methods](#methods)
  - [Examples](#examples)
- [storeEffect(target, effectFn)](#storeeffecttarget-effectfn)
  - [Parameters](#parameters-1)
  - [Examples](#examples-1)

## store(factory, options)

Creates a reactive store with computed state and methods.

### Parameters

- `factory`: Function that receives store signals and returns store definition
- `options`: Optional configuration object
  ```typescript
  interface StoreOptions {
    readonly?: boolean | string[];
    internalMutable?: boolean;
  }
  ```

### Methods

- `set(update)`: Batch update store properties
- `effect(fn)`: Register store-scoped effect
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
  total: () => (
    state.items().reduce((sum, item) => sum + item.price, 0)
  ),
  addItem: (item) => state.items.set([...state.items(), item]),
});

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
```

## storeEffect(target, effectFn)

Register effects that respond to specific store property changes.

### Parameters

- `target`: Store instance or tuple of [store, ...propertyNames]
- `effectFn`: Callback receiving changed property and new value

### Examples

```typescript
const theme = store((state) => ({
  mode: "light",
  accent: "blue",
  apply: () => applyTheme(state.mode(), state.accent()),
}));

// Watch all store changes
storeEffect(theme, (key, value) => {
  console.log(`Theme ${key} changed to:`, value);
});

// Watch specific properties & cleanup
const cleanup = storeEffect([theme, "mode", "accent"], (key, value) => {
  if (key === "mode") updateColorScheme(value);
  if (key === "accent") updateAccentColor(value);
});
// Cleanup later
cleanup();

// With TypeScript
interface UserStore {
  name: string;
  email: string;
  preferences: Record<string, any>;
}

const userStore = store<UserStore>((state) => ({
  name: "",
  email: "",
  preferences: {},
}));

storeEffect([userStore, "preferences"], (key, value) => {
  localStorage.setItem("userPreferences", JSON.stringify(value));
});
```
