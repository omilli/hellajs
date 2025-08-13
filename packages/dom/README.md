# @hellajs/dom

⮺ [Documentation](https://hellajs.com/packages/dom)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/dom)](https://www.npmjs.com/package/@hellajs/dom)
![Bundle Size](https://deno.bundlejs.com/badge?q=@hellajs/dom@0.14.5&treeshake=[*])

```bash
npm install @hellajs/dom
```

## Overview

`@hellajs/dom` is a lightweight library for building reactive web applications with JSX. It uses **direct DOM manipulation** and **granular reactivity**—only the specific elements that depend on changed signals are updated, not entire component trees.

## Features

- **No Virtual DOM**: Direct DOM manipulation for optimal performance.
- **Granular Updates**: Only affected DOM nodes update when signals change.
- **Function Reference Reactivity**: A simple and powerful pattern for reactive bindings.
- **Efficient List Rendering**: Optimized for dynamic lists with minimal DOM operations.
- **Automatic Cleanup**: Memory is managed automatically via `MutationObserver`.
- **Event Delegation**: Efficient global event handling system.

## ⚠️ Critical Pattern: Function Reference

For reactivity to work, you must **pass the signal function reference** directly in JSX, not the called value.

```jsx
const count = signal(0);

// ✅ Correct: Pass the function reference for reactivity.
<p>{count}</p>

// ❌ Incorrect: Calling the function breaks reactivity.
<p>{count()}</p>
```

## Quick Start

```jsx
import { signal } from '@hellajs/core';
import { mount, forEach } from '@hellajs/dom';

function App() {
  const count = signal(0);
  const items = signal(['Item 1', 'Item 2']);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onclick={() => count(count() + 1)}>Increment</button>
      
      <ul>
        {forEach(items, (item) => <li>{item}</li>)}
      </ul>
    </div>
  );
}

mount(App, '#app');
```

## API Reference

### `mount(component, rootSelector)`
Renders a component into a DOM element and establishes the reactive context.

```jsx
const Counter = () => {
  const count = signal(0);
  return <button>{count}</button>;
};

mount(Counter, '#app');
```

### `forEach(items, render)`
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

## Usage

- **Components** are simple functions that return JSX.
- **Reactivity** is achieved by passing signal functions for props, attributes, and children.
- **Conditionals** are JavaScript expressions wrapped in a function: `{() => isShown() ? <p>Visible</p> : null}`.
- **Lifecycle hooks** (`onUpdate`, `onDestroy`) can be added to elements for custom logic.

## TypeScript Support

The library is written in TypeScript and provides comprehensive type definitions for JSX elements and components.

```typescript
import { type VNode } from '@hellajs/dom';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button = (props: ButtonProps): VNode => {
  return <button onclick={props.onClick}>{props.label}</button>;
};
```

## License

MIT
