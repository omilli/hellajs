# @hellajs/dom

Lightweight DOM manipulation and granular reactivity. Only elements that depend on changed signals are updated, not entire component trees.

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

### Reactive Elements

```js
import { signal } from '@hellajs/core';
import { element, elements } from '@hellajs/dom';

const count = signal(0);
const isDisabled = signal(false);

// Single element reactive bindings
element('.counter').text(count);
element('.input').attr({ disabled: isDisabled });
element('.button').on('click', () => count(count() + 1));

// Multiple elements with bulk operations
const status = signal('ready');
elements('.status-indicator').forEach(elem => {
  elem.text(() => `Status: ${status()}`)
    .attr({ class: () => `indicator ${status()}` });
});

// Method chaining
element('.element')
  .text('Hello World')
  .attr({ class: 'active' })
  .on('click', handleClick);
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
