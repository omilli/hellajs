# HellaJS

**A reactive client-side framework for building web interfaces.**

⮺ [HellaJS Docs](https://hellajs.com)

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)

## Counter Example

``` jsx
import { signal } from "@hellajs/core";
import { html, mount } from "@hellajs/dom";

// Runtime element proxies
const { div, button, h1 } = html;

function Counter() {
  // Reactive signals
  const count = signal(0);
  // Derived state
  const countClass = () => count() % 2 === 0 ? "even" : "odd";
  const countLabel = () => `Count: ${count()}`;

  // Render JSX
  return (
    <div>
      {/* Functions make element attributes and text reactive */}
      <h1 class={countClass}>
        {countLabel}
      </h1>
      {/* Events are delegated to the mount element */}
      <button onclick={() => count(count() + 1)}>
        Increment
      </button>
    </div>
  );
}

// Mount the app
mount(Counter, '#counter');
```

## Overview

HellaJS is a collection of simple packages for building fast and lightweight user interfaces. It's designed to be modular, so you can choose the parts you need. The `core` package provides reactivity and additional packages can be used for routing, state management, and more.


## Project Goals

- **Quick**: Comparable speed to the most popular frameworks.
- **Lightweight**: Tiny bundles due to its modular architecture.
- **Efficient**: Low memory consumption and fast first paint.
- **Simple**: Familiar and friendly developer experience.
- **Composable**: Largely unopinionated and easily extendable.
- **Tested**: Over 130 tests and 95%+ test coverage.
- **Documented**: Clear and concise documentation with examples.

## Core Concepts

The development experience with JSX is familiar to anyone coming from React or Solid, but it's less opinionated and requires no compiler if you use [html](https://hellajs.com/packages/dom/html) proxy elements.

The core concepts are reactivity and granular DOM updates. [mount](https://hellajs.com/packages/dom/mount) is a one-time operation, and elements only react when their text content or an attribute is a [signal](https://hellajs.com/packages/core/signal) or derived function.

Instead of a virtual DOM, HellaJS uses a lightweight node registry, and components are automatically cleaned up after they are removed from the DOM.


## Packages
*Core is the only dependency required to use HellaJS packages.*

⮺ [Core](https://hellajs.com/packages/core/signal)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/core)](https://www.npmjs.com/package/@hellajs/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core@latest)](https://bundlephobia.com/package/@hellajs/core)


```bash
npm install @hellajs/core
```

⮺ [DOM](https://hellajs.com/packages/dom/mount)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/dom)](https://www.npmjs.com/package/@hellajs/dom)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/dom@latest)](https://bundlephobia.com/package/@hellajs/dom)

⮺ [CSS](https://hellajs.com/packages/css/css)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/css)](https://www.npmjs.com/package/@hellajs/css)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/css@latest)](https://bundlephobia.com/package/@hellajs/css)


```bash
npm install @hellajs/dom
```

⮺ [Resource](https://hellajs.com/packages/resource/resource)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/resource)](https://www.npmjs.com/package/@hellajs/resource)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/resource@latest)](https://bundlephobia.com/package/@hellajs/resource)

```bash
npm install @hellajs/resource
```

⮺ [Router](https://hellajs.com/packages/router/router)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/router)](https://www.npmjs.com/package/@hellajs/router)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/router@latest)](https://bundlephobia.com/package/@hellajs/router)

```bash
npm install @hellajs/router
```

⮺ [Store](https://hellajs.com/packages/store/store)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/store)](https://www.npmjs.com/package/@hellajs/store)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/store@latest)](https://bundlephobia.com/package/@hellajs/store)

```bash
npm install @hellajs/store
```


## Documentation

⮺ [HellaJS Docs](https://hellajs.com)
