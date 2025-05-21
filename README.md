# HellaJS

**A zero-build client-side framework for building reactive web interfaces.**

📖 [HellaJS Docs](https://hellajs.com)

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

### Composable Reactivity
Core reactive primitives like [signal](https://www.hellajs.com/api/reactive/signal/), [computed](https://www.hellajs.com/api/reactive/computed/), [effect](https://www.hellajs.com/api/reactive/effect/), [store](https://www.hellajs.com/api/reactive/store/), and [resource](https://www.hellajs.com/api/reactive/resource/) are composable and can be used independently or together for advanced state management patterns.

### Direct DOM Updates
There's no virtual DOM or diffing algorithm, [mount](https://www.hellajs.com/api/dom/mount/) is a one-time render. Updates are triggered only for the parts of the DOM that actually depend on changed state, minimizing unnecessary re-renders and increasing performance.

### Declarative Templates
Write  templates as JavaScript functions using proxy [html](https://www.hellajs.com/api/dom/html/) elements and the spread operator to pass attributes and child nodes. Handle lists with [forEach](https://www.hellajs.com/api/dom/foreach/) and conditional logic with [show](https://www.hellajs.com/api/dom/show/). No more messy template literals or JSX... Get functional!

### Zero Build
Tree-shakeable with zero dependencies and produces a small bundle size. There's no need for a compiler, or any other build step. Perfect for PWAs and decentralized static hosting services like IPFS and Arweave. 

## Environments

HellaJS supports a variety of modern workflows out of the box. Use as a comprehensive standalone client-side framework with [router](https://www.hellajs.com/api/router/router/), or with server-side rendering (SSR) frameworks like Astro to add reactive islands with no plugin or extra configuration steps required.

For best performance, serve `hella.esm.min.js.gz` from your server or CDN.

### Node

**CommonJS**
```js
const { html } = require("@hellajs/core");
```

**ES Modules / TypeScript**
```js
import { html } from "@hellajs/core";
```

### Browser

**Single File**
```html
<!-- Unminified -->
<script type="module" src="https://.../hella.esm.js"></script>
<!-- Minified -->
<script type="module" src="https://.../hella.esm.min.js"></script>
```

**Per-Module**  
Import individual modules directly from a server or CDN:
```js
// Unminified
import { html } from "https://.../esm/html.js";
// Minified
import { html } from "https://.../esm-min/html.js";
```
## Documentation

📖 [HellaJS Docs](https://hellajs.com)
