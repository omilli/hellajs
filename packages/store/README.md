# @hellajs/store

⮺ [Documentation](https://hellajs.com/reference/store/store)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/store)](https://www.npmjs.com/package/@hellajs/store)
![Bundle Size](https://edge.bundlejs.com/badge?q=@hellajs/store@0.14.6&treeshake=[*])

```bash
npm install @hellajs/store
```

## Overview

`@hellajs/store` provides a deeply reactive store for managing complex application state. It automatically converts nested objects and arrays into granular signals, offering full type safety and flexible readonly controls.

## Features

- **Deep Reactivity**: Automatically converts nested objects and arrays into reactive signals.
- **Type-Safe**: Full TypeScript support with deep type inference.
- **Readonly Controls**: Mark the entire store or specific properties as readonly.
- **State Replacement & Updates**: Replace the entire state by calling the store with a new object, or use `update` for predictable deep partial updates.
- **Automatic Cleanup**: A `cleanup()` method to release all reactive resources.
- **Seamless Integration**: Works perfectly with `@hellajs/core` primitives like `effect` and `computed`.

## Quick Start

```typescript
import { effect } from '@hellajs/core';
import { store } from '@hellajs/store';

const user = store({
  name: 'John',
  age: 30,
  settings: {
    theme: 'dark'
  }
});

// Effects react to any deep change
effect(() => {
  console.log(`Theme is: ${user.settings.theme()}`);
});

// Update nested properties
user.name('Jane');
user.settings.theme('light'); // Effect re-runs

// Replace the entire store state by calling the store as a function
user.set({
  name: 'Sam',
  age: 25,
  settings: { theme: 'blue' }
});

// Perform a deep partial update
user.update({ settings: { theme: 'blue' } });
```

## API Reference

### `store(initial, options?)`
Creates a deeply reactive store from a plain JavaScript object.

```typescript
const state = store({
  count: 0,
  user: { name: 'John' }
});

// Primitives become signals
state.count(1);

// Nested objects become nested stores
state.user.name('Jane');
```

### Store Methods

- **`computed`**: A `ReadonlySignal` that returns a plain JavaScript object snapshot of the current state.
- **`set(newState)`**: Replaces the entire state of the store with a new object.
- **`update(partial)`**: Performs a deep partial update, preserving untouched properties.
- **`cleanup()`**: Recursively cleans up all signals and nested stores to prevent memory leaks.

## Readonly Properties

Use the `readonly` option to prevent modifications to the entire store or specific properties.

```typescript
// Mark specific properties as readonly
const config = store({
  apiKey: 'secret-key',
  timeout: 5000
}, { 
  readonly: ['apiKey'] as const 
});

// Mark the entire store as readonly
const constants = store({ PI: 3.14 }, { readonly: true });
```

## TypeScript Support

The library provides full type safety with property-level type inference.

```typescript
interface AppState {
  user: { name: string; email: string; };
  theme: 'light' | 'dark';
}

const appStore = store<AppState>({
  user: { name: 'John', email: 'john@example.com' },
  theme: 'dark'
});

// Full type inference and safety
appStore.user.name('Jane');        // ✓ Valid
appStore.theme('blue');            // ✗ Type error
```

## License

MIT
