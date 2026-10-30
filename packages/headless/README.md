# @hellajs/headless

Headless util functions for common UI mechanics: focus traps, Escape and outside dismissal, roving tabindex, anchor positioning, hover intent, menu typeahead, pointer gestures, and layered dismissal. Each takes real DOM nodes and returns a dispose handle; state stays in your signals.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/headless?color=orange)](https://www.npmjs.com/package/@hellajs/headless)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/headless)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsheadless)**
- **[Headless Utils](https://hellajs.com/learn/concepts/headless-utils)**

## Quick Start

### Installation

```bash
npm install @hellajs/core @hellajs/dom @hellajs/headless
```

### Basic Usage

```jsx
import { mount } from '@hellajs/dom';
import { onEscape } from '@hellajs/headless';

function Panel() {
  return (
    <div
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) onEscape(node, () => node.remove());
      }}
    >
      Press Escape while focus is inside this panel to remove it
    </div>
  );
}

mount(Panel, '#app');
```

## Utils

Fifteen headless wiring utils ship under `@hellajs/headless/utils` (fourteen dispose-handle functions plus `modal`, which composes the dialog-family wiring with automatic, node-scoped disposal). Each util takes real DOM nodes and returns a dispose handle; state stays in caller signals.

- **trapFocus**: Trap Tab/Shift+Tab inside a container
- **onEscape**: Call a handler on Escape keydown
- **onOutside**: Call a handler on outside pointerdown
- **rovingTabIndex**: Arrow-key focus movement with a roving tabindex
- **anchorPosition**: Pin a floating element to an anchor across scroll and resize
- **computeAnchorPosition**: Pure placement math over plain rects
- **hoverIntent**: Open and close overlays on hover or focus delay
- **menuTypeahead**: Buffer keystrokes into a menu search
- **onDrag**: Track a pointer drag and report cumulative deltas
- **onSwipe**: Track a pointer swipe with commit and cancel
- **onPinch**: Track a two-pointer pinch
- **onLongPress**: Fire a handler after a timed press
- **onDoubleTap**: Fire on a second tap within a window
- **layerDismissal**: Dismiss stacked overlays one layer at a time
- **modal**: Arm a modal panel (trap, dismissal, exit notification) with automatic, node-scoped disposal

See [Headless Utils](https://hellajs.com/learn/concepts/headless-utils).

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.
