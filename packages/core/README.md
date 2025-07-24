# HellaJS Core

⮺ [Core Docs](https://hellajs.com/packages/core/signal)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/core)](https://www.npmjs.com/package/@hellajs/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core@latest)](https://bundlephobia.com/package/@hellajs/core)


```bash
npm install @hellajs/core
```


## Core Reactivity

`@hellajs/core` provides a reactivity system that enables automatic updates when data changes.

### Fundamental Concepts

The reactivity system is based around three primary primitives:

1. **Signals** - Reactive state containers that hold values which can change over time
2. **Computed Values** - Derived values that automatically update when their dependencies change
3. **Effects** - Side effects that execute when their dependencies change

### How Signals Work

Signals are the basic building blocks of the reactivity system. They store values and notify dependents when those values change. 

Internally, each signal maintains its current value, a reference to its previous value for change detection, and a network of subscription links to dependent computations and effects. When you access a signal's value within a reactive context, the signal automatically registers itself as a dependency of the currently executing computation or effect.

### How Computed Values Work

Computed values derive from signals or other computed values. They cache their result and only recalculate when their dependencies change.

When a computed value is accessed, it first checks if any of its dependencies have changed since the last calculation. If changes are detected, it re-executes its calculation function and updates its cached value. If no changes have occurred, it returns the cached value, avoiding unnecessary recalculations.

### How Effects Work

Effects handle side effects in your application. They automatically track dependencies and re-execute when those dependencies change.

When an effect runs, it captures any signal or computed value accessed during its execution. Later, if any of those dependencies change, the effect will run again, creating a reactive execution flow where changes to signals propagate through computations, triggering the necessary effects.

### Dependency Tracking System

The magic happens through automatic dependency tracking:

1. During execution of computed values and effects, the system tracks accessed signals
2. A directed graph of dependencies is built using a linked list structure
3. When a signal changes, it notifies its dependents
4. Changes propagate through the dependency graph efficiently

The dependency graph is dynamically created and updated during execution, ensuring that only the minimum necessary computations occur when data changes.

### Batching Updates

For performance optimization, HellaJS provides a batching mechanism. When multiple signals update within a batch, dependent effects will only run once after all changes are complete rather than after each change.

Batching helps avoid cascading updates and unnecessary recalculations when multiple related signals change simultaneously, improving performance by reducing redundant work and ensuring a smoother user experience.