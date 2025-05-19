# HellaJS

**A reactive UI library for the web.**

🌐 [HellaJS Documentation](https://hellajs.com)

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)

- **Reactive**: Fine-grained DOM reactivity with signals and effects.
- **Ergonomic**: Pure JS templating with element proxies.
- **Tiny**: Zero dependencies, tree-shakable, and fast.

---

## Quick Start

### 1. Install

```bash
npm install @hellajs/core
```

### 2. Counter Example

```typescript
import { html, signal, mount } from "@hellajs/core";

const { div, button, h1 } = html;

const count = signal(0);

function Counter() {
  return div(
    h1(
      () => `Count: ${count()}`
    ),
    button({ onclick: () => count.set(count() + 1) },
      "Increment"
    )
  );
}

mount(Counter, '#counter');
```

---

## Core API

### `signal`

Reactive primitive for state.

```typescript
const count = signal(0);

console.log(count()); // 0

count.set(1);
console.log(count()); // 1
```

---

### `computed`

Derived reactive values.

```typescript
const price = signal(10);
const quantity = signal(2);

const total = computed(() => price() * quantity());

console.log(total()); // 20

price.set(20);
console.log(total()); // 40
```

---

### `effect`

Run code in response to reactive changes.

```typescript
const name = signal("Alice");

effect(() => {
  document.title = `Hello, ${name()}!`;
});

name.set("Bob"); // document.title updates automatically
```

---

### `batch`

Batch multiple updates for performance.

```typescript
const a = signal(1);
const b = signal(2);

effect(() => {
  console.log("a:", a(), "b:", b());
});

batch(() => {
  a.set(10);
  b.set(20);
});
// Only one effect run, not two
```

---

### `store`

Deeply reactive state.

```typescript
const user = store({
  name: "Alice",
  age: 30,
  address: { city: "NYC", zip: "10001" }
});

effect(() => {
  console.log("User:", user.computed());
  // Logs raw object values
});

console.log(user.name()); // "Alice"
console.log(user.address.city()); // "NYC"

user.name.set("Bob");
user.address.city.set("LA");

user.update({ age: 31, address: { zip: "90001" } });
user.set({ name: "Eve", age: 22, address: { city: "SF", zip: "94101" } });

user.name.set("Charlie");

console.log("User:", user.computed());
// User: { name: "Charlie", age: 22, address: { city: "SF", zip: "94101" } }

user.cleanup();
```

---

### `html`

Ergonomic element factories.

```typescript
const { div, h1, button } = html;

const vnode = div(
  h1("Welcome!"),
  button({ onclick: () => alert("Clicked!") },
    "Click Me"
  )
);
```

---

### `forEach`

Keyed list rendering.

```typescript
const { ul, li } = html;

const items = signal([1, 2, 3]);

const List = ul(
  forEach(items, (item) =>
    li(`Item ${item}`)
  )
);
```

---

### `show`

Conditional rendering.

```typescript
const { div } = html;

// if/else pattern
const visible = signal(true);
const App = div(
  show(
    visible,
    () => div("Visible!"),
    () => div("Hidden!")
  )
);

// switch/case pattern
const theme = signal('light');
const App = div(
  show(
    [() => theme() === 'light', div("Light Theme")],
    [() => theme() === 'dark', div("Dark Theme")],
    () => div("Default Theme")
  )
);
```

---

### `mount`

Mount your app to the DOM.

```typescript
const { div } = html;

// Uses #app as the mount point if no selector is provided
mount(div("Hello, world!"));
```

---

### `context`

Provide and consume values in a component tree.

```typescript
import { context, html, mount } from "@hellajs/core";

const ThemeContext = context("light");
const { div, button } = html;

function ThemeProvider(props: { children: () => VNode }) {
  return ThemeContext.provide({
    value: "dark",
    children: props.children
  });
}

function ThemedButton() {
  const theme = ThemeContext.use();
  return button(`Theme: ${theme}`);
}

const App = ThemeProvider({
  children: () => div(ThemedButton())
});

mount(App, "#app");
```

---

### `router`

Minimal client-side router with hooks, params, and redirects.

```typescript
import { router, navigate, route } from "@hellajs/core";

// Example usage:
effect(() => {
  const r = route();
  console.log("Current path:", r.path);
  console.log("Params:", r.params);
  console.log("Query:", r.query);
  // You can use r.handler to render the current route's component
});

router({
  "/": () => { /* home handler */ },
  "/about": {
    handler: () => { /* about handler */ },
    before: () => { /* before hook */ },
    after: () => { /* after hook */ }
  },
  "/user/:id": (params) => {
    console.log(params.id); // dynamic param
  },
  "/old": "/new", // redirect
}, {
  before: () => { /* global before */ },
  after: () => { /* global after */ },
  404: () => { /* not found */ },
  redirects: [
    { from: ["/legacy"], to: "/" }
  ]
});

// Navigate programmatically
navigate("/about");
navigate("/user/:id", { id: "123" });
```

---

### `resource`

Reactive async data fetching with caching, abort, and mutation.

```typescript
import { resource, signal, effect } from "@hellajs/core";

// Example: fetch user by id
const userId = signal("1");
const userResource = resource(
  (id: string) => fetch(`/api/user/${id}`).then(r => r.json()),
  {
    key: () => userId(),
    initialData: null,
    cacheTime: 60000, // 1 minute cache
    onSuccess: (data) => console.log("Loaded", data),
    onError: (err) => console.error("Error", err)
  }
);

effect(() => {
  if (userResource.loading()) console.log("Loading...");
  if (userResource.error()) console.error(userResource.error());
  if (userResource.data()) console.log("User:", userResource.data());
});

// Refetch, reset, mutate, abort
userResource.refetch();
userResource.reset();
userResource.mutate(async () => {
  // optimistic update
  return { id: userId(), name: "New Name" };
});
userResource.abort();
```

---

## License

MIT
