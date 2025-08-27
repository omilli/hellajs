# HellaJS

A reactive JavaScript framework for building fast, lightweight user interfaces with fine-grained reactivity, without the complexity.

⮺ **[HellaJS Docs](https://hellajs.com)**

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)

## Features

- **🚀 Hella Fast**: Fine-grained reactivity, no virtual DOM overhead.
- **📦 Hella Small**: Less than 3.5KB gzipped, with a modular architecture.
- **👌 Hella Simple**: Familiar JSX syntax and a minimal API surface.
- **💪 Zero Dependencies**: Lean and mean, with no external dependencies.
- **✅ TypeScript Ready**: Full TypeScript support out of the box.
- **🧪 Fully Tested**: Over 95% test coverage for reliability.

## Counter Example

```jsx
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

function Counter() {
  // Reactive signals
  const count = signal(0);
  // Derived state
  const countClass = () => (count() % 2 === 0 ? "even" : "odd");
  const countLabel = () => `Count: ${count()}`;

  // Render JSX
  return (
    <div>
      {/* Functions make element attributes and text reactive */}
      <h1 class={countClass}>{countLabel}</h1>
      {/* Events are delegated to the mount element */}
      <button onClick={() => count(count() + 1)}>Increment</button>
    </div>
  );
}

// Mount the app
mount(Counter, "#counter");
```

## Core Concepts

HellaJS is built on a foundation of powerful, yet simple reactive primitives.

- **⚡ [Reactivity](https://hellajs.com/learn/concepts/reactivity)**: Fine-grained reactive system with signals, computed values, and effects.
- **📝 [Templates](https://hellajs.com/learn/concepts/templates)**: JSX templates and component patterns for building reactive user interfaces.
- **💾 [State](https://hellajs.com/learn/concepts/state)**: Local component state and global application state management.
- **🧭 [Routing](https://hellajs.com/learn/concepts/routing)**: Reactive client-side router with hash support for single-page applications.
- **🎨 [Styling](https://hellajs.com/learn/concepts/styling)**: Dynamic CSS classes, inline styles, and CSS-in-JS approaches.
- **🌍 [Resources](https://hellajs.com/learn/concepts/resources)**: Reactive Data fetching, caching, and server state management.

## Packages

HellaJS is a modular collection of packages. Use only what you need.

| Package | Description |
| --- | --- |
| **[@hellajs/core](packages/core/README.md)** | Reactive Primitives |
| **[@hellajs/dom](packages/dom/README.md)** | Reactive Components |
| **[@hellajs/css](packages/css/README.md)** | Reactive CSS-in-JS |
| **[@hellajs/resource](packages/resource/README.md)** | Reactive Resources |
| **[@hellajs/router](packages/router/README.md)** | Reactive Routing |
| **[@hellajs/store](packages/store/README.md)** | Reactive State |

## Getting Started

Check out the **[Quick Start Guide](https://hellajs.com/learn/quick-start)** for more details.

## Documentation

For more detailed information, tutorials, and API references, visit the **[HellaJS Docs](https://hellajs.com)**.
