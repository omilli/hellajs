# Mount

The `mount` function connects a component function to the DOM with reactive
updates.

## Core Functionality

- Creates a reactive connection between a component function and the DOM
- Automatically updates the DOM when reactive dependencies change
- Uses the diffing algorithm for efficient updates
- Returns a cleanup function to unmount the component

## Examples

### Basic Usage

```typescript
import { html, mount, signal } from "@hellajs/core";
const { div, h1, button } = html;

// Create reactive state
const count = signal(0);

// Define a component function
const Counter = () =>
  div(
    h1(`Count: ${count()}`),
    button({ onclick: () => count.set(count() + 1) }, "Increment"),
  );

// Mount the component to the DOM
const unmount = mount(Counter, "#app");

// The DOM will automatically update when count changes
count.set(5);

// To remove the component and clean up
unmount();
```

### Component Memoization with computed

````typescript
import { signal, computed, html, mount } from '@hellajs/core';
const { div, ul, li } = html;

const items = signal(['Apple', 'Banana', 'Cherry']);

// Wrap complex elements with computed for memoization
const ItemList = computed(() => 
  ul(
    ...items().map(item => li(item))
  )
);

// Use the memoized component in the mount function
mount(() => div(ItemList()), '#app');


### Multiple Components

```typescript
import { signal, html, mount } from '@hellajs/core';
const { div, p } = html;

const username = signal('Guest');

// Mount multiple components that share the same state
mount(() => div(p(`Header: ${username()}`)), '#header');
mount(() => div(p(`Welcome, ${username()}`)), '#main');
mount(() => div(p(`Footer: ${username()}`)), '#footer');

// All three components update when the signal changes
username.set('John');
````

### Custom Context

```typescript
import { context, html, mount, signal } from "@hellajs/core";
const { div, p, button } = html;

// Create an isolated context
const appContext = context("app");
const count = appContext.signal(0);

const App = () =>
  div(
    p(`Count: ${count()}`),
    button({ onclick: () => count.set(count() + 1) }, "Increment"),
  );

// Mount with the specific context
mount(App, "#app", appContext);
```

### Cleanup Handling

```typescript
import { effect, html, mount, signal } from "@hellajs/core";
const { div, p } = html;

const isVisible = signal(true);
const data = signal("Loading...");

// Set up a component with cleanup logic
const App = () => {
  if (isVisible()) {
    return div(p(data()));
  } else {
    return div(p("Hidden"));
  }
};

// Store the unmount function
const unmount = mount(App, "#app");

// Later, clean up everything
function cleanupApplication() {
  // Unmount component and clean up all event listeners
  unmount();
}
```
