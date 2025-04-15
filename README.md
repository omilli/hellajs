# HellaJS

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/7ae414a56d67a99b07fe34009d9cda95/raw/hellajs-coverage.json)![Static Badge](https://img.shields.io/badge/runtime-bun-f472b6.svg)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)

A lightweight reactive UI library with fine-grained reactivity and virtual DOM
diffing.

## Core Features

- **Reactivity**: Signals, computed values, and effects for precise dependency
  tracking
- **Components**: Function-based components that automatically update when
  dependencies change
- **Rendering**: Isomorphic rendering for both client and server
- **Context**: Isolated environments for state management
- **Type Safety**: Full TypeScript for all elements and APIs

## Getting Started

```bash
npm install @hellajs/core
```

```typescript
import { html, mount, signal } from "@hellajs/core";

// Ergonomic element proxies
const { div, button, span } = html;

// Create reactive state OUTSIDE component functions
const count = signal(0);

// Define component functions that use signals
const Counter = () =>
  div(
    { className: "counter" },
    button({ onclick: () => count.set(count() - 1) }, "-"),
    span(count()),
    button({ onclick: () => count.set(count() + 1) }, "+"),
  );

// Mount reactive components
mount(Counter, "#app");
```

## Important: Signal Placement

⚠️ **Always define signals outside component functions**

```typescript
// ✅ CORRECT: Signals defined outside component function
const name = signal("John");
const Counter = () => div(name());

// ❌ INCORRECT: Signals would be recreated on each render and lose reactivity
const WrongCounter = () => {
  const counter = signal(0); // Don't do this!
  return div(counter());
};
```

Signals defined inside component functions won't maintain their values between
renders and won't trigger reactive updates properly.

## Core API

### Reactivity

```typescript
import { computed, effect, signal } from "@hellajs/core";

// Signals - reactive state
const count = signal(0);
const firstName = signal("John");
const lastName = signal("Doe");

// Read signal values
console.log(count()); // 0

// Update signals
count.set(5);
count.update((prev) => prev + 1); // Now 6

// Computed values - derived state that updates automatically
const fullName = computed(() => `${firstName()} ${lastName()}`);
console.log(fullName()); // "John Doe"

firstName.set("Jane");
console.log(fullName()); // "Jane Doe" (updates automatically)

// Effects - run side effects when dependencies change
const cleanup = effect(() => {
  console.log(`${fullName()} counted to ${count()}`);
  // Logs: "Jane Doe counted to 6"

  // Any time count OR fullName changes, this runs again
});

count.set(7); // Effect runs: "Jane Doe counted to 7"
lastName.set("Smith"); // Effect runs: "Jane Smith counted to 7"

// Stop the effect when no longer needed
cleanup();

// After cleanup, changes don't trigger the effect
count.set(8); // No logging happens
```

### Virtual DOM

#### Creating Elements

```typescript
import { html } from "@hellajs/core";
const { div, h1, p, ul, li } = html;

// Simple elements
const header = h1("Hello World");

// With attributes
const actionButton = button({
  className: "primary",
  disabled: false,
  onclick: () => console.log("clicked"),
}, "Click Me");

// Nested structure
const content = div(
  { className: "content" },
  h1("My App"),
  p("Welcome to my application"),
  ul(
    li("Item 1"),
    li("Item 2"),
  ),
);
```

#### Fragments

```typescript
import { html } from "@hellajs/core";
const { tr, td, $ } = html;

// Create multiple elements without a wrapper
const tableRows = $(
  tr(td("Row 1, Cell 1"), td("Row 1, Cell 2")),
  tr(td("Row 2, Cell 1"), td("Row 2, Cell 2")),
);
```

### Components

Components are just functions that return virtual DOM nodes:

```typescript
import { html, signal } from "@hellajs/core";
const { div, h2, input, button } = html;

// State must be defined outside the component
const username = signal("");

// Component that uses the external state
function UserForm() {
  const handleSubmit = () => {
    console.log(`Submitting: ${username()}`);
  };

  return div(
    { className: "form" },
    h2("User Registration"),
    input({
      value: username(),
      oninput: (_, el) => username.set((el as HTMLInputElement).value),
      placeholder: "Enter username",
    }),
    button({ onclick: handleSubmit }, "Submit"),
  );
}
```

### Mounting

```typescript
import { mount } from "@hellajs/core";

// Mount a component with reactive updates
const unmount = mount(UserForm, "#registration");

// Later, clean up resources
unmount();
```

## Advanced Features

### Batch Updates

```typescript
import { batch, signal } from "@hellajs/core";

const x = signal(0);
const y = signal(0);

// Group updates to prevent intermediate effects
batch(() => {
  x.set(100);
  y.set(200);
});
```

### Untracked Reads

```typescript
import { effect, signal, untracked } from "@hellajs/core";

const count = signal(0);
const settings = signal({ debug: true });

effect(() => {
  console.log(`Count: ${count()}`);

  // Read settings without creating a dependency
  if (untracked(() => settings().debug)) {
    console.log("Debug info: ", { count: count() });
  }
});
```

### Context Isolation

```typescript
import { context, signal } from "@hellajs/core";

// Create isolated contexts
const appContext = context("app");
const adminContext = context("admin");

// Each context has its own reactive system
const appCount = appContext.signal(0);
const adminCount = adminContext.signal(0);

// Effects are isolated to their context
appContext.effect(() => {
  console.log(`App count: ${appCount()}`);
});

// This won't trigger effects in the other context
adminCount.set(5);
```
