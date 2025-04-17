# HellaJS

A lightweight reactive UI library with fine-grained reactivity and virtual DOM
diffing.

🌐 [HellaJS Documentation](https://hellajs.github.io/hellajs/)

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)

![Static Badge](https://img.shields.io/badge/lint-biome-60a5fa.svg)
![Static Badge](https://img.shields.io/badge/test-bun-f472b6.svg)
![Static Badge](https://img.shields.io/badge/build-bun-f472b6.svg)

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
    button({ onclick: () => count.set(count() - 1) }, "-"),
    span(count()),
    button({ onclick: () => count.set(count() + 1) }, "+"),
  );

// Mount reactive components
mount(Counter, "#app");
```

## 💥 Important: Signal Placement

**Always define signals outside component functions**

Unlike other libraries, reactive state and functions that update state **MUST** be defined **OUTSIDE** of the component function.
Signals defined inside component functions won't maintain their values between renders or trigger reactive updates.

Use `context` if you need to create isolated state.

```typescript
import { html, context, signal } from "@hellajs/core";

const { div } = html;

// ✅ CORRECT: Signals defined outside component function
const ctx = context("user"); // Optional context
const count = ctx.signal(0);
const setCounter = (changeBy) => count.set(count() + changeBy)

const Counter = () =>
  div(
    button({ onclick: () => setCounter(-1) }, "-"),
    span(count()),
    button({ onclick: () => setCounter(+1) }, "+"),
  );

ctx.mount(Counter, "#app");


// ❌ INCORRECT: Signals would be recreated on each render and lose reactivity
const Counter = () => {
   // This will not work as expected
  const count = signal(0);
  const setCounter = (changeBy) => count.set(count() + changeBy)

  return div(
    button({ onclick: () => count.set(count() - 1) }, "-"),
    span(count()),
    button({ onclick: () => count.set(count() + 1) }, "+"),
  );
}
```

## Reactive State

```typescript
import { computed, effect, signal } from "@hellajs/core";

// Signals - reactive state containers
const user = signal("guest");
const preferences = signal({ 
  darkMode: false,
  notifications: true 
});

// Reading signals
console.log(name()); // "guest"
console.log(preferences().darkMode); // false

// Computed signals
const username = computed(() => {
  // Automatically tracks dependency on user()
  return user() === "guest" ? "Guest User" : user();
});

const theme = computed(() => {
  // Automatically tracks dependency on preferences().darkMode
  return preferences().darkMode ? "dark-theme" : "light-theme";
});

// Runs immediately and when any dependency changes
const cleanup = effect(() => {
  document.body.className = theme();
  document.title = `${username()} (${counter()})`;
  
  console.log(`Updated UI: user=${username()}, theme=${theme()}, count=${counter()}`);
});

// These changes will trigger the effect
user.set("bob");
preferences.update(p => ({ ...p, darkMode: true })); 

console.log(username()); // "bob"
console.log(theme()); // "dark-theme"

// Clean up when done
cleanup();

// Changes after cleanup don't trigger effects
name.set("alice");
```

## DOM Manipulation

#### Elements

```typescript
import { html } from "@hellajs/core";

const { div, h1, p, ul, li } = html;

// Simple elements
const header = h1("Hello World");

// With attributes and events
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

## Components

Components are just functions that return virtual DOM nodes:

```typescript
import { html, signal, mount } from "@hellajs/core";

const { div, h2, input, button } = html;

// State must be defined outside the component
const username = signal("");

// State update functions must also be outside the component
const handleSubmit = () => {
  console.log(`Submitting: ${username()}`);
};

// Component that uses the external state
const UserForm = () =>
  div({ className: "form" },
    h2("User Registration"),
    input({
      value: username(),
      oninput: (_, el) => username.set((el as HTMLInputElement).value),
      placeholder: "Enter username",
    }),
    button({ onclick: handleSubmit }, "Submit"),
  )

// Mount a component with reactive updates
mount(UserForm, "#registration");
```