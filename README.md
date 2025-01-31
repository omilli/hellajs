# Hella (Alpha)

Another Javascript framework... Because that's what the world needs...

## Features

- 🚀 Fast & Reactive
- 🛠️ Typesafe HTML/CSS-in-JS
- 🔄 Simple State Management
- 🛣️ Router With Guards And Redirects

## Core Concepts

### Components

Components in Hella are functions that return DOM nodes. They can be either stateless or stateful.

```typescript
import { html } from "hella";

const { div, h1, p } = html;

const Header = () =>
  div(
    {
      mount: "app",
      class: "header",
    },
    [h1("Welcome to Hella!"), p("Under Construction")]
  );

render(Header);

/* Renders
 * <div class="header">
 *   <h1>Welcome to Hella!</h1>
 *   <p>Under Construction</p>
 * </div>
 **/
```

### Reactive State

Signals are the foundation of reactivity in Hella.

```typescript
import { signal, effect } from "hella";

const count = signal(0);

effect(() => {
  console.log("Count changed:", count()); // returns 1
});

count.set(count() + 1);
```

### Stores

Manage complex application state with stores.

```typescript
import { store } from "hella";

const counterStore = store((state) => ({
  count: 0,
  increment: () => state.count.set(state.count() + 1),
  decrement: () => state.count.set(state.count() - 1),
}));
```

### CSS-in-JS

Write scoped CSS directly in your components.

```typescript
import { css, html } from "hella";

const { button } = html;

const Button = () =>
  button(
    {
      css: css({
        backgroundColor: "blue",
        color: "white",
        padding: "10px 20px",
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
