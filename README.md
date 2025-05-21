# HellaJS

**A reactive client-side framework for building web interfaces.**

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
  // Reactive signals
  const count = signal(0);
  // Derived state
  const countClass = () => count() % 2 === 0 ? "even" : "odd";
  const countLabel = () => `Count: ${count()}`;
  
  // Render DOM Nodes
  return div(
    // Functions make element attributes and text reactive
    h1({ class: countClass },
      countLabel
    ),
    // Events are delegated to the mount element
    button({ onclick: () => count.set(count() + 1) },
      "Increment"
    )
  );
}

// Mount the app
mount(Counter, '#counter');
```

## Features

HellaJS is a largely unopinionated, browser-first framework designed to be comprehensive, lightweight, and simple. Inspiration for the reactive API comes from Angular, while SolidJS influences the functional approach and granular DOM updates. It's tree-shakeable with zero dependencies and produces small bundles. HellaJS should be compatible with any bundler, but there's no need for a compiler or any other build step.

### Composable Reactivity
Create powerful state using reactive functions like [signal](https://www.hellajs.com/api/reactive/signal/), [computed](https://www.hellajs.com/api/reactive/computed/), [effect](https://www.hellajs.com/api/reactive/effect/), [store](https://www.hellajs.com/api/reactive/store/), and [resource](https://www.hellajs.com/api/reactive/resource/). Reactivity is highly composable and works well for basic or complex state management.

### Declarative Templates
Build templates using proxy [html](https://www.hellajs.com/api/dom/html/) elements. Use the spread operator to define attributes and child nodes. Handle lists with [forEach](https://www.hellajs.com/api/dom/foreach/) and conditional logic as `if/else` / `switch` with [show](https://www.hellajs.com/api/dom/show/).

### Direct DOM Updates
There's no virtual DOM and [mount](https://www.hellajs.com/api/dom/mount/) is a one-time render. Updates are triggered only for the parts of the DOM that depend on the changed state, minimizing unnecessary re-renders.

## Environments

HellaJS supports a variety of modern workflows out of the box. Use it as a comprehensive standalone client-side framework with [router](https://www.hellajs.com/api/router/router/), or with server-side rendering (SSR) frameworks like Astro to add reactive islands with no plugin or extra configuration steps required.

For best performance, serve `hella.esm.min.js.gz` from your server or CDN.

### Node

```
npm install @hellajs/core
```

**CommonJS**
```js
const { html } = require("@hellajs/core");
```

**ES Modules / TypeScript**
```js
import { html } from "@hellajs/core";
```

### Browser

Import directly from a server or CDN:


**Single File**
```html
<!-- Unminified -->
<script type="module" src="https://.../hella.esm.js"></script>
<!-- Minified -->
<script type="module" src="https://.../hella.esm.min.js"></script>
```

**Per-Module**  
```js
// Unminified
import { html } from "https://.../esm/html.js";
// Minified
import { html } from "https://.../esm-min/html.js";
```
## Documentation

📖 [HellaJS Docs](https://hellajs.com)
