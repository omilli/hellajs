# HellaJS

A lightweight JavaScript UI framework with fine-grained reactivity.

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)

**[HellaJS Documentation](https://hellajs.com)**

## Key Features

- **🚀 Hella Fast**: Fine-grained reactivity, no virtual DOM overhead
- **📦 Hella small**: Starting around 3.5KB gzipped, with a modular architecture
- **📖 Hella Simple**: Well documented with a minimal API and JSX templates
- **🧪 Hella Tested**: ~250 tests with ~99% test coverage

## Basic Example

```jsx
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

function Counter() {
  const count = signal(0);
  return <button onClick={() => count(count() + 1)}>{count}</button>;
}

mount(Counter, "#app");
```

Want something more advanced? **[Build a Todo App](https://hellajs.com/learn/tutorials/todo-app)** with HellaJS.

## Reactive Packages

HellaJS is a modular collection of reactive packages, with @hellajs/core as a peer dependency.

| Package | Version | Size |
| --- | --- | --- |
| **[@hellajs/core](packages/core/README.md)** | [![NPM Version](https://img.shields.io/npm/v/@hellajs/core?color=orange)](https://www.npmjs.com/package/@hellajs/core) | ![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core) |
| **[@hellajs/css](packages/css/README.md)** | [![NPM Version](https://img.shields.io/npm/v/@hellajs/css?color=orange)](https://www.npmjs.com/package/@hellajs/css) | ![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/css) |
| **[@hellajs/dom](packages/dom/README.md)** | [![NPM Version](https://img.shields.io/npm/v/@hellajs/dom?color=orange)](https://www.npmjs.com/package/@hellajs/dom) | ![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/dom) |
| **[@hellajs/resource](packages/resource/README.md)** | [![NPM Version](https://img.shields.io/npm/v/@hellajs/resource?color=orange)](https://www.npmjs.com/package/@hellajs/resource) | ![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/resource) |
| **[@hellajs/router](packages/router/README.md)** | [![NPM Version](https://img.shields.io/npm/v/@hellajs/router?color=orange)](https://www.npmjs.com/package/@hellajs/router) | ![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/router) |
| **[@hellajs/store](packages/store/README.md)** | [![NPM Version](https://img.shields.io/npm/v/@hellajs/store?color=orange)](https://www.npmjs.com/package/@hellajs/store) | ![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/store) |















## Getting Started

For more detailed information, tutorials, and API references, visit the **[HellaJS Documentation](https://hellajs.com)**.

