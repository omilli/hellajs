# @hellajs/dom

⮺ [Documentation](https://hellajs.com/reference/dom/mount)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/dom)](https://www.npmjs.com/package/@hellajs/dom)
![Bundle Size](https://img.shields.io/badge/bundle-4.42KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-1.78KB-blue)

```bash
npm install @hellajs/dom
```

## Overview

`@hellajs/dom` is a lightweight library for building reactive web applications with JSX. It uses **direct DOM manipulation** and **granular reactivity**—only the specific elements that depend on changed signals are updated, not entire component trees.

## Features

- **No Virtual DOM**: Direct DOM manipulation for optimal performance.
- **Granular Updates**: Only affected DOM nodes update when signals change.
- **Efficient List Rendering**: Optimized for dynamic lists with minimal DOM operations.
- **Automatic Cleanup**: Memory is managed automatically via `MutationObserver`.
- **Event Delegation**: Efficient global event handling system.

## Quick Start

```jsx
import { signal } from '@hellajs/core';
import { mount, forEach } from '@hellajs/dom';

function App() {
  const count = signal(0);
  const items = signal(['Item 1', 'Item 2']);

  return (
    <div>
      <h1>Count: {count()}</h1>
      <button onClick={() => count(count() + 1)}>Increment</button>
      
      <ul>
        {forEach(items, (item) => <li>{item}</li>)}
      </ul>
    </div>
  );
}

mount(App, '#app');
```

## API Reference

### `mount(vNode, rootSelector?)`
Renders a component into a DOM element and establishes the reactive context.

```jsx
const Counter = () => {
  const count = signal(0);
  return <button onClick={() => count(count() + 1)}>{count()}</button>;
};

mount(Counter, '#app'); // Defaults to '#app' if not specified
```

### `forEach(each, use)`
Efficiently renders dynamic lists with key-based optimization. It uses a Longest Increasing Subsequence (LIS) algorithm for minimal DOM operations.

```jsx
const users = signal([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

<ul>
  {forEach(users, (user) =>
    <li key={user.id}>{user.name}</li>
  )}
</ul>
```

### Type Exports
- `VNode` - Virtual node interface
- `VNodeValue` - Any value that can be rendered 
- `HellaElement` - DOM element with HellaJS enhancements
- `ElementLifecycle` - Lifecycle hook interfaces
- `ForEach<T>` - Type for forEach render functions

## Usage

### Components
Components are simple functions that return JSX.

```jsx
const Greeting = (props) => {
  return <h1>Hello, {props.name}!</h1>;
};
```

### Reactivity
Reactivity is achieved by passing signal functions for props, attributes, and children.

```jsx
const count = signal(0);
<div class={() => count() > 5 ? 'high' : 'low'}>
  Count: {count()}
</div>
```

### Event Handling
Events come with automatic cleanup.

```jsx
<button onClick={() => console.log('clicked')}>Click me</button>
```

### Conditionals
JavaScript expressions wrapped in functions for reactive rendering.

```jsx
{() => isShown() ? <p>Visible</p> : null}
```

### Lifecycle Hooks
Add `onUpdate` and `onDestroy` callbacks directly to elements.

```jsx
<div 
  onDestroy={() => console.log('Element destroyed')}
  onUpdate={() => console.log('Element updated')}
>
  Content
</div>
```

### List Rendering
Use `forEach` for efficient dynamic lists with automatic diffing.

```jsx
const items = signal(['a', 'b', 'c']);
<ul>
  {forEach(items, (item, index) =>
    <li key={index}>{item}</li>
  )}
</ul>
```

## TypeScript Support

The library is written in TypeScript and provides comprehensive type definitions for JSX elements and components.

```typescript
import { type VNode } from '@hellajs/dom';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button = (props: ButtonProps): VNode => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
```

## License

MIT
