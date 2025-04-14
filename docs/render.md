# Render Function

The `render()` function transforms virtual DOM nodes (VNodes) into actual DOM elements or HTML strings.

## Behavior

- In browser environments: Creates DOM elements and inserts them at the target
- In server environments: Generates an HTML string representation
- Replaces any existing content at the target location
- Performs a one-time rendering operation

## Examples

### Browser Rendering

```typescript
import { html, render } from '@hellajs/core';
const { div, h1 } = html;

// Create virtual DOM structure
const vNode = div(
  h1('Hello, World!')
);

// Render to DOM element with ID 'app'
render(vNode, '#app');
```

### Server Rendering

```typescript
import { html, render } from '@hellajs/core';
const { div, h1 } = html;

const vNode = div(
  h1('Server-rendered content')
);

// Generate HTML string
const htmlString = render(vNode);
console.log(htmlString);
// Output: "<div><h1>Server-rendered content</h1></div>"
```

### Attribute Handling

```typescript
import { html, render } from '@hellajs/core';
const { div, input } = html;

render(
  div(
    // Standard attributes
    input({ type: 'text', placeholder: 'Enter text' }),
    
    // Boolean attributes
    input({ type: 'checkbox', checked: true }),
    
    // Data attributes
    div({ dataset: { userId: '123' } })
  ),
  '#container'
);
```

## When to Use `render` vs. `mount`

-   **`mount`:** Use this for component-based development where you need automatic DOM updates based on reactive state changes (signals, effects). It handles the diffing and rendering internally. This is the recommended approach for most application development.

-   **`render`:** Use this for:
    -   Initial, one-time rendering of a virtual DOM structure to the DOM, replacing any existing content. It does *not* set up reactive updates.
    -   Server-side rendering (SSR), where it generates an HTML string from a virtual DOM structure.
