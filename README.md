# HellaJS

A lightweight JavaScript UI framework with fine-grained reactivity.

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)

**[HellaJS Documentation](https://hellajs.com)**

## Key Features

- **🚀 Blazing Fast**: Fine-grained reactivity, no virtual DOM overhead
- **📦 Tiny Bundles**: Around 3.5KB gzipped, with a modular architecture
- **📖 Hella Simple**: Well documented with a minimal API and JSX templates
- **🧪 Well Tested**: Over 200 tests with close to 100% test coverage

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

| Package | Reactivity | Size (gzipped) |
| --- | --- | --- |
| **[@hellajs/core](packages/core/README.md)** | Primitives | 1.73 KB |
| **[@hellajs/css](packages/css/README.md)** | Styling | 1.88 KB |
| **[@hellajs/dom](packages/dom/README.md)** | Components | 1.89 KB |
| **[@hellajs/resource](packages/resource/README.md)** | Resources | 0.74 KB |
| **[@hellajs/router](packages/router/README.md)** | Routing | 1.85 KB |
| **[@hellajs/store](packages/store/README.md)** | State | 0.68 KB |













## Getting Started

For more detailed information, tutorials, and API references, visit the **[HellaJS Documentation](https://hellajs.com)**.

