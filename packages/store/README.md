# HellaJS Store

⮺ [Store Docs](https://hellajs.com/packages/store/store)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/store)](https://www.npmjs.com/package/@hellajs/store)
![Bundle Size](https://deno.bundlejs.com/badge?q=@hellajs/store@0.14.0&treeshake=[*])


```bash
npm install @hellajs/store
```

## Reactive State Management

`@hellajs/store` provides a structured approach to managing state by transforming plain JavaScript objects into reactive stores.


```ts
import { effect } from '@hellajs/core';
import { store } from '@hellajs/store';

const user = store({
  name: 'John',
  age: 30,
  settings: {
    theme: 'dark',
    notifications: true
  }
});

effect(() => {
  console.log(`${user.name()} is ${user.age()} years old`);
  console.log(`Theme: ${user.settings.theme()}`);
});

user.age(31);
user.settings.theme('light');

const snapshot = user.computed();
user.update({ name: 'Jane', settings: { notifications: false } });
```

### Store Structure

At its core, the [`store`](https://hellajs.com/packages/store/store) system creates a reactive proxy around a plain object. Each property in the object is transformed into a signal, allowing the property to be both read and written to reactively. The resulting store maintains the same shape as the original object but with reactive capabilities embedded throughout.

### Property Transformation

When a store is created, it processes each property of the input object:

1. Primitive values are converted to signals
2. Nested objects are recursively converted into nested stores
3. Functions remain untouched, preserving their behavior
4. Read-only properties are converted to computed values

This automatic transformation creates a consistent reactive interface regardless of the original object's structure or depth.

### Nested Reactivity

The store system handles nested objects by recursively applying the store creation process. Each level of nesting becomes its own sub-store, maintaining the object hierarchy while ensuring all properties remain reactive. Changes to deeply nested properties propagate outward, triggering any dependent computations or effects.

### Selective Immutability

Properties can be marked as read-only, creating a form of selective immutability. The system supports:

1. Marking specific properties as read-only via an array of property names
2. Making the entire store read-only with a global option

Read-only properties are internally implemented as computed values that can be read but not directly written to, enforcing immutability at the property level.

### Unified Update Model

The store provides a consistent interface for updating state:

1. Direct property access for reading values
2. Method-based updates for modifying multiple properties at once
3. Deep partial updates that preserve untouched properties

This unified approach simplifies state management across complex object structures, eliminating the need for immutable update patterns or complex state merging.

### Object Snapshots

A key feature of the store is its ability to produce snapshots of the current state. The `computed` method traverses the entire store structure, extracting the current value of each property to create a plain JavaScript object. This enables easy serialization, comparison, or debugging without losing the reactive capabilities of the original store.

### Resource Management

The store system includes automatic cleanup through its `cleanup` method. This traverses the entire store hierarchy, calling cleanup methods on any nested reactive resources to prevent memory leaks. This integration with the HellaJS lifecycle ensures efficient resource usage throughout your application.

### Integration with Core Reactivity

The store seamlessly integrates with HellaJS's core reactivity system:

1. Property access triggers signal dependencies
2. Updates to properties trigger signal updates
3. Computed properties derive from other store values
4. Effects respond to changes in the store

This tight integration creates a cohesive developer experience where object-oriented programming styles and reactive programming naturally coexist.