# HellaJS

**A zero-build client-side framework for building reactive web interfaces.**

🌐 [HellaJS Documentation](https://hellajs.com)

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)


## Counter Example

```typescript
import { html, signal, mount } from "@hellajs/core";

// Runtime element proxies
const { div, button, h1 } = html;

function Counter() {
  // Reactive state
  const count = signal(0);
  const countClass = () => count() % 2 === 0 ? "even" : "odd";
  const countLabel = () => `Count: ${count()}`;

  // State modifier
  const increment = () => {
    count.set(count() + 1);
  };
  
  // Render DOM Nodes
  return div(
  // Functions make element attributes and text reactive
    h1({ class: countClass },
      countLabel
    ),
    // Events are delegated to the mount element
    button({ onclick: increment },
      "Increment"
    )
  );
}

// Mount the app
mount(Counter, '#counter');
```

## Features

HellaJS is a largely unopinionated, browser-first framework for building web applications. It's designed to be comprehensive, lightweight, and simple. The reactive API is heavily inspired by Angular signals, while the granular DOM updates are inspired by SolidJS.

  - **Zero Build**: No compiler required. Just include the script tag in your HTML.
  - **Reactive**: Built-in reactivity with signals, computed values, and effects.
  - **Granular**: Components are scoped, render once, and directly update the DOM.
  - **Declarative**: Write HTML-like templates with JavaScript expressions.
  - **Lightweight**: Small bundle size, tree-shakeable, zero dependencies.
  - **Simple**: A slim but powerful API that's easy to learn and use.