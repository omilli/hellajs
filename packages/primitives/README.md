# @hellajs/primitives

Headless DOM behaviors for copy/paste components: focus trapping, escape and outside wiring, and roving tabindex. Pure functions over real DOM nodes, zero dependencies.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/primitives?color=orange)](https://www.npmjs.com/package/@hellajs/primitives)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/primitives)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsprimitives)**
- **[Headless Behaviors](https://hellajs.com/learn/concepts/headless-behaviors)**

## Quick Start

### Installation

```bash
npm install @hellajs/primitives
```

### Basic Usage

Wire behaviors through the `hook:` element prefixes: `hook:afterMount` hands you the rendered element, `hook:beforeDestroy` is the cleanup point. No element querying anywhere.

```jsx
import { mount } from "@hellajs/dom";
import { trapFocus } from "@hellajs/primitives";

let release: (() => void) | undefined;

const Panel = () => (
  <div
    hook:afterMount={(node) => {
      if (node instanceof HTMLElement) release = trapFocus(node);
    }}
    hook:beforeDestroy={() => release?.()}
  >
    <button>First focusable</button>
    <input placeholder="Second focusable" />
  </div>
);

mount(<Panel />, "#app");
```

Every behavior returns a dispose handle that removes its listeners and undoes its DOM mutations. Wire several together and dispose them in one path:

```jsx
import { mount } from "@hellajs/dom";
import { onEscape, onOutside, rovingTabIndex } from "@hellajs/primitives";

const wirings: (() => void)[] = [];
const closeMenu = () => {
  wirings.forEach((dispose) => dispose());
  wirings.length = 0;
};

const Menu = () => (
  <nav
    hook:afterMount={(node) => {
      if (!(node instanceof HTMLElement)) return;
      wirings.push(
        onEscape(node, closeMenu),
        // The getter re-resolves per event, so portal targets stay correct
        onOutside(() => [node], closeMenu)
      );
    }}
    hook:beforeDestroy={closeMenu}
  >
    <div
      role="tablist"
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) {
          wirings.push(rovingTabIndex(node, { orientation: "horizontal", loop: false }));
        }
      }}
    >
      <button role="tab">One</button>
      <button role="tab">Two</button>
    </div>
  </nav>
);

mount(<Menu />, "#app");
```

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
