# HellaJS DOM

⮺ [DOM Docs](https://hellajs.com/packages/dom/mount)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/dom)](https://www.npmjs.com/package/@hellajs/dom)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/dom@latest)](https://bundlephobia.com/package/@hellajs/dom)


```bash
npm install @hellajs/dom
```

## DOM Manipulation

`@hellajs/dom` is a lightweight, self-cleaning, high-performance rendering library that uses fine-grained reactivity over virtual DOM diffing.

### Reactive Rendering

The update system works at a granular level. Each dynamic expression in a template has independent tracking. Only the specific DOM nodes that depend on the corresponding signal are updated when a signal's value changes, meaning no unnecessary re-renders of parent or sibling elements.

### Component Model

Components in HellaJS DOM are simply functions that return DOM elements. This simple functional approach enables component composition and reuse. There's no complex component lifecycle to learn; components render based on their inputs and internal state.

### Event Handling System

The DOM library implements an efficient event delegation system. Rather than attaching individual event listeners to each element, it registers global handlers and routes events to the appropriate elements. This approach improves performance and automatically cleans up event handlers when elements are removed from the DOM.

### List Rendering

For rendering dynamic lists, HellaJS DOM provides a specialized forEach function. This system intelligently updates lists when items are added, removed, or reordered, minimizing DOM operations. It uses key-based reconciliation to maintain element identity across updates.

### Memory Management

Memory management happens automatically through a node registry system. When elements are removed from the DOM, their associated event handlers, effects, and signal subscriptions are cleaned up to prevent memory leaks.

### JSX Integration

The library supports JSX through plugins, allowing you to write declarative UI code with familiar syntax. Alternatively, you can use the HTML proxy pattern, which provides a fluent interface for creating elements without requiring a build step.