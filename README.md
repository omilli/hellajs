# Hella (Alpha)

Another Javascript framework...

## Features

- 🚀 Blazing Fast
- 🎯 Granular Reactivity
- 🔄 State Management
- 🛣️ Simple Routing
- 🔗 Reactive Resources

### Bundle Size

**~7.2 kB** │ gzip: **~3 kB**

## Core Concepts

### Reactive Components

Components in Hella are stateless objects but they can be wrapped and returned in functions to make them stateful.

Returning values from functions makes Hella Components reactive.

```typescript
import { computed, effect, html, render, signal } from "hella";

const count = signal(0);
const doubleCount = computed(() => count() * 2); // Automatically updated

effect(() => {
  // Effects are called when are value inside changes
  console.log("Count changed:", count());
});

function setCount(total: number) {
  count.set(total);
}

const { div, header, button, span, h1 } = html;

const HeaderComponent = {
  tag: "header",
  content: [
    {
      tag: "h1",
      content: "Counter App",
    },
  ],
};

const CounterComponent = div([
  button(
    {
      onclick: () => setCount(count() + 1),
    },
    "Increment"
  ),
  span(() => `Count is ${count()}`), // Make nodes reactive by using functions
  button(
    {
      onclick: () => setCount(count() - 1),
    },
    "Decrement"
  ),
]);

const App = () => {
  console.log("App Init");

  return div(
    {
      mount: "#app",
      class: "counter-app",
    },
    [HeaderComponent, CounterComponent]
  );
};

render(App);

// <div class="counter-app">
//   <header>
//     <h1>Counter App</h1>
//   </header>
//   <div>
//     <button>Increment</button>
//     Count is 0
//     <button>Decrement</button>
//   </div>
// </div>
```

### State Stores

Manage complex application state with stores.

```typescript
const counterState = store((state) => ({
  count: 0,
  doubleCount: () => state.count() * 2,
}));

function incrementCount() {
  counterState.count.set(counterState.count() + 1);
}
```

Readonly stores can only use internal functions to mutate values.

```typescript
import { store } from "hella";

const counterStore = store(
  (state) => ({
    count: 0,
    increment: () => state.count.set(state.count() + 1),
  }),
  { readonly: [] } // add keys here or empty array for all keys
);

// This wont work
function incrementCount() {
  counterState.count.set(counterState.count() + 1);
}
```

### Routing

Built-in router with support for params, guards, and redirects.

```typescript
import { router, routerGuard } from "hella";

routerGuard(["/admin/*"], () => ({
  allowed: isAuthenticated(),
  redirectTo: "/login",
}));

routerRedirect("/from/*", "/to");

beforeNavigate(["*"], () => {
  console.log("Before Navigation");
});

afterNavigate(["*"], () => {
  console.log("After Navigation");
});

router.start({
  "/": "/home",
  "/home": () => render(HomePage),
  "/users/:id": (params) => render(UserPage, params),
  "/admin": () => render(AdminPage),
  "/lazy": async () => {
    const { ExampleApp } = await import("./example-app");
    render(ExampleApp);
    return () => someCleanupFunction();
  },
});

console.log(isActiveRoute("/home")); // Returns boolean
```
