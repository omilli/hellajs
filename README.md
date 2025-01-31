# Hella (Alpha)

Another Javascript framework... Because that's what the world needs...

## Features

- 🚀 Fast & Reactive
- 🛠️ Typesafe HTML/CSS-in-JS
- 🔄 Simple State Management
- 🛣️ Router With Guards And Redirects

## Core Concepts

### Reactive Components

Components in Hella are functions that return DOM nodes. They can be either stateless or stateful. You need to pass a signal or a function to make them reactive.

```typescript
import { signal, effect, html } from "hella";

const { div, button } = html;

const count = signal(0);
const doubleCount = computed(() => count() * 2);

function setCount(total) {
  count.set(total);
}

effect(() => console.log("Count changed:", count()));

const Counter = () =>
  div([
    button({ onclick: () => setCount(count() + 1) }, "Increment"),
    () => `Count is ${count()}`,
    button({ onclick: () => setCount(count() - 1) }, "Decrement"),
  ]);

render(Counter);
```

### State Stores

Manage complex application state with stores. Make stores readonly and only functions declared inside the store can mutate state.

```typescript
import { store } from "hella";

const counterStore = store((state) => ({
  count: 0,
  increment: () => state.count.set(state.count() + 1),
  decrement: () => state.count.set(state.count() - 1),
}));

// or

const counterState = store((state) => ({
  count: 0,
  doubleCount: () => state.count() * 2,
}));

export function incrementCount() {
  counterState.count.set(counterState.count() + 1);
}

export function decrementCount() {
  counterState.count.set(counterState.count() - 1);
}
```

### CSS-in-JS

Write scoped CSS directly in your components and get automatic type support.

```typescript
import { css, html } from "hella";

const { button } = html;

const Button = () =>
  button(
    {
      css: css({
        backgroundColor: "blue",
        color: "white",
        padding: 10, // Auto set to px/rem/etc...
        ":hover": {
          backgroundColor: "darkblue",
        },
      }),
    },
    "Click me"
  );
```

### Routing

Built-in router with support for params and guards.

```typescript
import { router, routerGuard } from "hella";

routerGuard(["/admin"], () => ({
  allowed: isAuthenticated(),
  redirectTo: "/login",
}));

router.start({
  "/": () => render(HomePage),
  "/users/:id": (params) => render(UserPage, params),
  "/admin": () => render(AdminPage),
});
```

## Examples

[Example Code](./examples/)

https://hella-alpha.vercel.app/
