# @hellajs/core

A reactive system that updates automatically when data changes. Uses a directed acyclic graph (DAG) with propagation and topological execution order. 

The core package is a heavily modified fork of the excellent **[Alien Signals](https://github.com/stackblitz/alien-signals)** library.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/core)](https://www.npmjs.com/package/@hellajs/core)
![Bundle Size](https://img.shields.io/badge/bundle-4.31KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-1.73KB-blue)

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
import { signal, computed, effect } from '@hellajs/core';

// Create reactive state
const count = signal(0);
const multiplier = signal(2);

// Derive values automatically
const doubled = computed(() => count() * multiplier());

// Handle side effects with automatic cleanup
const cleanup = effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Logs: "Count: 5, Doubled: 10"
count(5);

// Stop the effect
cleanup();

```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.