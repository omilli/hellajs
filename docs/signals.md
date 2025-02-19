# Reactive Primitives API Reference

## Table of Contents

- [Overview](#overview)
  - [Features](#features)
  - [Signal Types](#signal-types)
- [API](#api)
  - [signal](#signal)
  - [computed](#computed)
  - [effect](#effect)
  - [batchSignals](#batchSignals)
- [Technical Details](#technical-details)
  - [Dependency Tracking](#dependency-tracking)
  - [Signal Lifecycle](#signal-lifecycle)
  - [Memory Management](#memory-management)
  - [Performance](#performance)
  - [Security](#security)

## Overview

Reactive primitives provide fine-grained reactivity through signals, computed values, and effects. The system uses automatic dependency tracking, batched updates, and proxy-based reactivity for optimal performance and developer experience.

### Features

- Fine-grained reactivity
- Automatic dependency tracking
- Computed derivations
- Side effects
- Batched updates
- Lifecycle hooks
- Memory leak protection
- Security controls
- TypeScript support

### Signal Types

```typescript
// Core signal type
interface Signal<T> {
  (): T; // Read value
  set: (value: T) => void; // Set value
  subscribe: (fn: () => void) => () => void; // Subscribe to changes
  dispose: () => void; // Cleanup resources
}

// Signal configuration
interface SignalConfig<T> {
  onRead?: (value: T) => void;
  onWrite?: (oldValue: T, newValue: T) => void;
  onSubscribe?: (subscriberCount: number) => void;
  onUnsubscribe?: (subscriberCount: number) => void;
  onDispose?: () => void;
  validate?: (value: T) => boolean;
  sanitize?: (value: T) => T;
}

// Computed configuration
interface ComputedConfig<T> {
  name?: string;
  onCreate?: () => void;
  onCompute?: (value: T) => void;
}

// Effect options
interface EffectOptions {
  immediate?: boolean;
}
```

## API

### signal(initial, config?)

Creates a reactive primitive for state management.

#### Parameters

- `initial`: Initial value of any type
- `config`: Optional SignalConfig object

#### Returns

A Signal function that can be called to read the value and has methods to manipulate it.

#### Examples

```typescript
// Basic signal
const count = signal(0);
count(); // read: 0
count.set(1); // write: 1

// With validation
const positiveCount = signal(0, {
  validate: (n) => n >= 0,
  sanitize: (n) => Math.max(0, n)
});

// With lifecycle hooks
const tracked = signal(0, {
  onRead: (v) => console.log('Read:', v),
  onWrite: (old, new) => console.log('Changed:', old, '=>', new),
  onSubscribe: (count) => console.log('Subscribers:', count)
});

// With custom equality
const obj = signal({ x: 0 }, {
  equal: (a, b) => a.x === b.x
});

// Advanced usage with security
const secured = signal("secret", {
  validate: validateSecret,
  sanitize: sanitizeInput,
  onWrite: auditChange
});
```

### computed(fn, config?)

Creates a derived signal that updates when dependencies change.

#### Parameters

- `fn`: Function that computes the derived value
- `config`: Optional ComputedConfig object

#### Returns

A read-only Signal containing the computed value.

#### Examples

```typescript
// Basic computed
const count = signal(0);
const doubled = computed(() => count() * 2);

// With objects
const user = signal({ name: "John", age: 30 });
const isAdult = computed(() => user().age >= 18);

// With multiple signals
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = computed(() => `${firstName()} ${lastName()}`);

// Lifecycle hooks
const tracked = computed(() => count() * 2, {
  name: "doubleCount",
  onCreate: () => console.log("Created"),
  onCompute: (v) => console.log("Computed:", v),
});

// Advanced chaining
const items = signal([1, 2, 3]);
const filtered = computed(() => items().filter((n) => n > 1));
const sum = computed(() => filtered().reduce((a, b) => a + b, 0));
```

### effect(fn, options?)

Creates a side effect that automatically tracks and reacts to signal changes.

#### Parameters

- `fn`: Effect function to execute
- `options`: Optional EffectOptions object

#### Returns

A dispose function that stops the effect.

#### Examples

```typescript
// Basic effect
const count = signal(0);
effect(() => console.log("Count changed:", count()));

// DOM updates
const title = signal("Hello");
effect(() => {
  document.title = title();
});

// Cleanup pattern
effect(() => {
  const handler = (e) => console.log(e);
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
});

// Conditional execution
const enabled = signal(true);
effect(() => {
  if (!enabled()) return;
  runExpensiveOperation();
});

// Resource management
effect(() => {
  const connection = setupConnection();
  onCleanup(() => connection.close());
});
```

### batchSignals(fn)

Batches multiple signal updates to trigger effects once.

#### Parameters

- `fn`: Function containing signal updates

#### Examples

```typescript
const count = signal(0);
const total = signal(0);

// Without batching (3 updates)
count.set(count() + 1);
total.set(total() + count());
count.set(count() + 1);

// With batching (1 update)
batchSignals(() => {
  count.set(count() + 1);
  total.set(total() + count());
  count.set(count() + 1);
});

// Nested batching
batchSignals(() => {
  count.set(count() + 1);
  batchSignals(() => {
    total.set(total() + count());
  });
});

// Transaction pattern
batchSignals(() => {
  try {
    updateMultipleSignals();
  } catch (e) {
    rollback();
  }
});
```

## Technical Details

### Dependency Tracking

1. **Automatic Collection**

   - Execution context stack
   - Fine-grained dependencies
   - Circular dependency detection
   - Dead dependency cleanup

2. **Security**

   ```typescript
   // Dependencies are tracked internally
   effect(() => {
     console.log(count()); // Automatically tracked
   });

   // Max dependency limits enforced
   if (maxDepsExceeded(deps.size)) {
     throw new Error("Dependencies limit exceeded");
   }
   ```

### Signal Lifecycle

1. **Creation**

   - Initial value validation
   - Proxy setup
   - Security checks
   - Subscriber initialization

2. **Updates**

   - Value validation
   - Change detection
   - Batching
   - Effect triggering

3. **Disposal**
   - Subscriber cleanup
   - Memory release
   - Resource disposal
   - Cache invalidation

### Performance

1. **Update Optimization**

   - Microtask batching
   - Dependency caching
   - Value memoization
   - Change coalescing

2. **Memory Management**
   - WeakRef usage
   - Automatic cleanup
   - Resource tracking
   - Memory limits

### Security

1. **Value Protection**

   - Input validation
   - Output sanitization
   - XSS prevention

2. **Resource Limits**

   - Max subscribers
   - Max dependencies
   - Stack depth
   - Update frequency

3. **Access Control**
   - Read-only signals
   - Private state
   - Audit logging
   - Error boundaries
