# @hellajs/dom

Surgical DOM updates with granular reactivity, custom elements, lazy loading, and error boundaries. Only elements that depend on changed signals are updated, not entire component trees.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/dom?color=orange)](https://www.npmjs.com/package/@hellajs/dom)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/dom)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsdom)**
- **[DOM Concepts](https://hellajs.com/learn/concepts/templates)**

## Quick Start

### Installation

```bash
npm install @hellajs/core @hellajs/dom
```

### Basic Usage

```jsx
import { signal } from '@hellajs/core';
import { mount, ForEach } from '@hellajs/dom';

function App() {
  const count = signal(0);
  const items = signal([
    { id: 1, label: 'Item 1' },
    { id: 2, label: 'Item 2' },
    { id: 3, label: 'Item 3' }
  ]);

  return (
    <div>
      <h1>Count: {count()}</h1>
      <button on:click={() => count(count() + 1)}>Increment</button>

      <ul>
        <ForEach
          each={items}
          use={(item) => <li key={item.id}>{item.label}</li>}
        />
      </ul>
    </div>
  );
}

mount(App, '#app');
```

## Behaviors

Four headless wiring functions ship flat on the barrel. Each takes real DOM nodes and returns a dispose handle; state stays in caller signals.

- **trapFocus**: Trap Tab/Shift+Tab inside a container
- **onEscape**: Call a handler on Escape keydown
- **onOutside**: Call a handler on outside pointerdown
- **rovingTabIndex**: Arrow-key focus movement with a roving tabindex

See [Headless Behaviors](https://hellajs.com/learn/concepts/headless-behaviors).

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
