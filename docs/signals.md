# Reactive Primitives API Reference

## Index

- [signal(initial, config?)](#signalinitial-config)
  - [Parameters](#parameters)
  - [Methods](#methods)
  - [Examples](#examples)
- [computed(fn, config?)](#computedfn-config)
  - [Parameters](#parameters-1)
  - [Examples](#examples-1)
- [effect(fn, options?)](#effectfn-options)
  - [Parameters](#parameters-2)
  - [Examples](#examples-2)
- [immutable(name, value)](#immutablename-value)
  - [Parameters](#parameters-4)
  - [Examples](#examples-4)
- [batchSignals(fn)](#batchsignalsfn)
  - [Parameters](#parameters-3)
  - [Examples](#examples-3)

## signal(initial, config?)

Creates a reactive primitive for state management.

### Parameters

- `initial`: Initial value of any type
- `config`: Optional configuration object
  ```typescript
  interface SignalConfig<T> {
    onRead?: (value: T) => void;
    onWrite?: (oldValue: T, newValue: T) => void;
    onSubscribe?: (subscriberCount: number) => void;
    onUnsubscribe?: (subscriberCount: number) => void;
    onDispose?: () => void;
  }
  ```

### Methods

- `set(newValue)`: Updates signal value
- `subscribe(fn)`: Subscribes to value changes
- `dispose()`: Cleanup signal resources

### Examples

```typescript
// Basic usage
const count = signal(0);
count(); // read: 0
count.set(1); // write: 1

// With configuration
const logged = signal(0, {
  onWrite: (old, new) => console.log(`Changed from ${old} to ${new}`)
});

// Subscribe to changes
const unsubscribe = count.subscribe(() =>
  console.log('Count changed:', count())
);
// Unsubscribe later
unsubscribe();
```

## computed(fn, config?)

Creates a derived signal that updates when dependencies change.

### Parameters

- `fn`: Function that computes the derived value
- `config`: Optional configuration object
  ```typescript
  interface ComputedConfig<T> {
    onCreate?: () => void;
    onCompute?: (value: T) => void;
  }
  ```

### Examples

```typescript
const count = signal(0);
const doubled = computed(() => count() * 2);

const firstName = signal("John");
const lastName = signal("Doe");
const fullName = computed(() => `${firstName()} ${lastName()}`);

// With configuration
const tracked = computed(() => count() * 2, {
  onCompute: (value) => console.log("Computed:", value),
});
```

## effect(fn, options?)

Creates a side effect that automatically tracks and responds to signal changes.

### Parameters

- `fn`: Effect function to execute
- `options`: Optional configuration
  ```typescript
  interface EffectOptions {
    immediate?: boolean;
  }
  ```

### Examples

```typescript
// Basic effect
effect(() => console.log("Count is:", count()));

// DOM updates
const title = signal("Hello");
effect(() => {
  document.title = title();
});

// Cleanup on disposal
effect(() => {
  const handler = (e) => console.log(e);
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
});
```

## immutable(name, value)

Creates an immutable signal that warns on mutation attempts.

### Parameters

- `name`: String identifier for the immutable signal
- `value`: Initial value that cannot be modified

### Examples

```typescript
// Basic usage
const VERSION = immutable("VERSION", "1.0.0");

// Object values
const CONFIG = immutable("CONFIG", {
  apiUrl: "https://api.example.com",
  timeout: 5000,
});

// Using with TypeScript
interface Theme {
  primary: string;
  secondary: string;
}

const THEME = immutable<Theme>("THEME", {
  primary: "#007bff",
  secondary: "#6c757d",
});

// All modifications will log warnings
VERSION.set("2.0.0"); // Warning: Cannot modify immutable signal: VERSION
CONFIG.set({}); // Warning: Cannot modify immutable signal: CONFIG
THEME.set({}); // Warning: Cannot modify immutable signal: THEME
```

## batchSignals(fn)

Batches multiple signal updates to trigger effects only once.

### Parameters

- `fn`: Function that contains multiple signal updates

### Examples

```typescript
const count = signal(0);
const total = signal(0);
const name = signal("John");

// Without batching (triggers effects multiple times)
count.set(count() + 1);
total.set(total() + count());
name.set("Jane");

// With batching (triggers effects once)
batchSignals(() => {
  count.set(count() + 1);
  total.set(total() + count());
  name.set("Jane");
});

// Nested batching
batchSignals(() => {
  count.set(count() + 1);
  batchSignals(() => {
    total.set(total() + count());
    name.set("Jane");
  });
});
```
