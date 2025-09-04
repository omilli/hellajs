# @hellajs/dom

Lightweight DOM manipulation and granular reactivity. Only elements that depend on changed signals are updated, not entire component trees.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/dom)](https://www.npmjs.com/package/@hellajs/dom)
![Bundle Size](https://img.shields.io/badge/bundle-4.48KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-1.89KB-blue)

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
import { mount, forEach } from '@hellajs/dom';

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
      <button onClick={() => count(count() + 1)}>Increment</button>
      
      <ul>
        {forEach(items, (item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}

mount(App, '#app');
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
