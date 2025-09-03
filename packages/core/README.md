# @hellajs/core

⮺ [Documentation](https://hellajs.com/reference/core/signal)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/core)](https://www.npmjs.com/package/@hellajs/core)
![Bundle Size](https://img.shields.io/badge/bundle-3.49KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-1.44KB-blue)

```bash
npm install @hellajs/core
```

## Overview

`@hellajs/core` provides a high-performance reactive system that enables automatic updates when data changes. It implements a directed acyclic graph (DAG) with efficient propagation and topological execution order, forming the foundation of the HellaJS ecosystem.

## Features

- **Zero-dependency** reactive primitives with minimal bundle size.
- **DAG-based execution** ensures predictable update order: signals → computed → effects.
- **Efficient memory management** with automatic cleanup and garbage collection.
- **TypeScript-first** with complete type safety and inference.
- **Batching support** for performance optimization.
- **Lazy evaluation** of computed values.

## Quick Start

```typescript
import { signal, computed, effect, batch } from '@hellajs/core';

// Create reactive state
const count = signal(0);
const multiplier = signal(2);

// Derive values automatically
const doubled = computed(() => count() * multiplier());

// Handle side effects with automatic cleanup
const cleanup = effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Update state
count(5); // Logs: "Count: 5, Doubled: 10"

// Batch multiple updates into one
batch(() => {
  count(10);
  multiplier(3);
}); // Logs: "Count: 10, Doubled: 30" (runs once)

// Stop the effect
cleanup();
```

## API Reference

### `signal(initialValue?)`
Creates a reactive primitive that holds a value and notifies subscribers when it changes.

```typescript
// Creates a Signal<number>
const count = signal(0);
console.log(count());    // Read value: 0
count(10);               // Set new value

// Optional signal
const user = signal<User | undefined>();
console.log(user());     // undefined initially
```

### `computed(getter)`
Creates a read-only signal that automatically updates when its dependencies change.

```typescript
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
firstName("Jane");
console.log(fullName()); // "Jane Doe"
```

### `effect(fn)`
Creates a reactive computation that automatically runs when its dependencies change. Returns a `cleanup` function to stop the effect.

```typescript
const name = signal("World");
const cleanup = effect(() => console.log(`Hello, ${name()}!`));

name("Alice"); // Logs: "Hello, Alice!"
cleanup();     // Stop the effect
name("Bob");   // No longer logs
```

### `batch(fn)`
Groups multiple signal updates to trigger effects only once after all updates complete.

```typescript
batch(() => {
  count(30);
  multiplier(40);
}); // Effects run only once with the final state
```

### `untracked(fn)`
Executes a function without tracking its signal dependencies, preventing an effect from re-running when those signals change.

```typescript
effect(() => {
  console.log(`Count is: ${count()}`);
  // This effect will not re-run if multiplier changes
  const m = untracked(() => multiplier());
});
```

## Core Concepts

- **Reactive DAG:** Updates flow in a predictable topological order (signals → computeds → effects), ensuring data consistency.
- **Lazy Evaluation:** Computed values only recalculate when their dependencies have changed and they are accessed.
- **Automatic Cleanup:** The system automatically manages memory by disconnecting signals and effects when they are no longer referenced.

## TypeScript Support

The library is written in TypeScript and provides comprehensive type inference.

```typescript
// Type is inferred automatically
const count = signal(0);        // Signal<number>
const name = signal("hello");   // Signal<string>

// Computed values also infer their return type
const doubled = computed(() => count() * 2); // ReadonlySignal<number>
```

## License

MIT
