# HTML

The `html` object provides a simple way to create virtual DOM elements.

## Core Functionality

- Dynamically creates element factory functions for HTML tags
- Handles attribute and property assignment
- Supports nested children and fragments
- Automatically flattens arrays of children

## Examples

### Basic Element Creation

```typescript
import { html } from '@hellajs/core';
const { div, h1, p, span } = html;

// Create a simple element hierarchy
const vNode = div(
  h1('Hello World'),
  p('This is a paragraph'),
  span('And a span')
);
```

### Using Attributes and Properties

```typescript
import { html } from '@hellajs/core';
const { div, input, button } = html;

// Elements with attributes
const form = div(
  input({ 
    type: 'text',
    placeholder: 'Enter your name',
    className: 'input-field',
    required: true
  }),
  button({ 
    type: 'submit',
    className: 'btn primary',
    disabled: false
  }, 'Submit')
);
```

### Event Handlers

```typescript
import { html } from '@hellajs/core';
const { button } = html;

// Adding event handlers
const actionButton = button({ 
  onclick: (e) => {
    console.log('Button clicked!', e);
    e.preventDefault();
  }
}, 'Click Me');
```

### Fragments

Fragments allow you to group multiple elements without creating an unnecessary wrapper element in the DOM. This is useful when:

- You need to return multiple elements from a component
- You want to avoid adding extra divs to the DOM structure
- You're inserting elements into a parent where only specific children are valid (like `<tr>` in a `<table>`)

```typescript
import { html } from '@hellajs/core';
const { tr, td } = html;
const { $ } = html; // Fragment helper

// Using fragments in dynamic tables where wrappers would be invalid
const tableRows = $(
  tr(td('Row 1, Cell 1'), td('Row 1, Cell 2')),
  tr(td('Row 2, Cell 1'), td('Row 2, Cell 2'))
);

mount(tableRows, '#table-body');
```

### Conditional Rendering with Fragments

```typescript
import { html } from '@hellajs/core';
const { div, h1, p, $ } = html;

const isAuthenticated = true;
const username = 'John';

// Conditionally render multiple elements without a wrapper
const authContent = isAuthenticated
  ? $(
      h1(`Welcome back, ${username}!`),
      p('Your dashboard is ready.')
    )
  : $(
      h1('Please sign in'),
      p('Authentication required to continue.')
    );

// Use inside another element without unnecessary nesting
const app = div(authContent);
```

### Dynamic Children

```typescript
import { html } from '@hellajs/core';
const { ul, li, span } = html;

const items = ['Apple', 'Banana', 'Cherry'];

// Generate elements from data
const list = ul(
  items.map(item => 
    li(
      span({ className: 'item-name' }, item)
    )
  )
);
```