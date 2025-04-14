# Diff Function

The `diff()` function efficiently updates existing DOM elements by comparing them with a virtual DOM representation.

## Behavior

The diffing process:
1. Finds the target element in the DOM
2. Compares it with the provided virtual node
3. Makes the minimum necessary changes to update the DOM:
   - Updates text content for text nodes
   - Updates attributes and properties
   - Adds, removes, or updates child nodes as needed
4. Preserves DOM elements when possible instead of recreating them

## Examples

### Basic Usage

```typescript
import { html, diff } from '@hellajs/core';
const { div, p } = html;

// Update an existing element
diff(div(p('Updated content')), '#app');
```

### Updating Attributes

```typescript
import { html, diff } from '@hellajs/core';
const { button } = html;

// Update attributes on an existing element
diff(
  button({ 
    className: 'primary', 
    disabled: true 
  }, 
  'Submit'),
  '#submit-button'
);
```

### Updating Children

```typescript
import { html, diff } from '@hellajs/core';
const { ul, li } = html;

// Update a list with new items
diff(
  ul(
    li('Item 1'),
    li('Item 2'),
    li('Item 3')
  ),
  '#list'
);
```

## When to Use `diff` vs. `mount`

-   **`mount`:** Use this for component-based development where you need automatic DOM updates based on reactive state changes (signals, effects). It handles the diffing and rendering internally. This is the recommended approach for most application development.

-   **`diff`:** Use this when you need to manually update an *existing* DOM element based on a new virtual DOM structure, without setting up a reactive component context. This is useful for:
    -   Integrating with non-HellaJS code that manages its own state.
    -   Performing targeted, one-off updates where the full reactivity of `mount` is unnecessary overhead.
    -   Fine-grained control over the update process in performance-critical sections.