# @hellajs/core

High-performance reactive primitives using doubly-linked dependency graphs and topological execution. Implements a directed acyclic graph where signals are sources, computed values are transforms, and effects are sinks. Updates propagate through the graph in topological order with glitch-free guarantees.

A heavily modified fork of the excellent **[Alien Signals](https://github.com/stackblitz/alien-signals)** library.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/core?color=orange)](https://www.npmjs.com/package/@hellajs/core)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajscore)**
- **[Reactive Concepts](https://hellajs.com/learn/concepts/reactivity)**

## Quick Start

### Installation

```bash
npm install @hellajs/core
```

### Basic Usage

```typescript
import { signal, computed, effect, batch, untracked, scope } from '@hellajs/core';

// Create signals (writable state)
const count = signal(0);
const multiplier = signal(2);

// Create computed (derived state)
const doubled = computed(() => count() * multiplier());

// Create effect (side effect that auto-runs when dependencies change)
const effectCleanup = effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Batch multiple updates to run effects once
batch(() => {
  count(count() + 1);
  multiplier(3);
});

// Cleanup effect when done
effectCleanup();

// Read signal inside effect without creating dependency
effect(() => {
  const current = untracked(() => multiplier());
  console.log(`Count: ${count()}, Multiplier: ${current}`);
  // Only re-runs when count changes, not multiplier
});

// Batch-dispose multiple effects with scope
const scopeCleanup = scope(() => {
  effect(() => console.log(`Count: ${count()}`));
  effect(() => console.log(`Doubled: ${doubled()}`));
});

// Stop all effects in scope at once
scopeCleanup();
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.