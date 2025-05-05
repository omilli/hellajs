# HellaJS

**A JS-first UI library for modern web apps.**


- **Reactive**: Fine-grained DOM reactivity with signals.
- **Ergonomic**: Element proxies for pure JS templating.
- **Tiny**: Zero dependencies, tree-shakable, and fast.

## Quick Start

### 1. Install

```bash
npm install @hellajs/core
```

### 2. Counter Example

```typescript
import { html, render, signal, Component } from "@hellajs/core";

const { Div, Button, H1 } = html;

const count = signal(0);

const Counter = Component(() =>
  Div(
    H1("Count: ", count),
    Button({ onclick: () => count.set(count() + 1) }, "Increment")
  )
);

render(Counter);
```

---

## Core Concepts & API

### `signal`

Reactive primitives for state.

```typescript
import { signal } from "@hellajs/core";

const count = signal(0);

// Read value
console.log(count()); // 0

// Update value
count.set(1);
console.log(count()); // 1
```

---

### `computed`

Derived reactive values.

```typescript
import { signal, computed } from "@hellajs/core";

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
import { signal, effect } from "@hellajs/core";

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
import { signal, batch, effect } from "@hellajs/core";

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
import { store, effect } from "@hellajs/core";

const user = store({
  name: "Alice",
  age: 30,
  address: { city: "NYC", zip: "10001" }
});

// Read values
console.log(user.name()); // "Alice"
console.log(user.address.city()); // "NYC"

// Update values
user.name.set("Bob");
user.address.city.set("LA");

// Partial update
user.$update({ age: 31, address: { zip: "90001" } });

// Replace all
user.$set({ name: "Eve", age: 22, address: { city: "SF", zip: "94101" } });

// Reactivity
effect(() => {
  console.log("User:", user.$computed());
});
user.name.set("Charlie"); // logs updated user object

// Cleanup
user.$cleanup();
```

---

### `resource`

Async resource for loading/fetching data.

```typescript
import { resource, effect } from "@hellajs/core";

// Create a resource from a fetcher
const user = resource(() => fetch("/api/user").then(r => r.json()));

// Use in effect or component
effect(() => {
  const { value, loading, error } = user();
  if (loading) {
    console.log("Loading...");
  } else if (error) {
    console.error("Error:", error);
  } else if (value) {
    console.log("User loaded:", value);
  }
});

// Manually refetch
user.refetch();
```

---

### `html`

Ergonomic element factories.

```typescript
import { html } from "@hellajs/core";

const { Div, H1, Button } = html;

const vnode = Div(
  H1("Welcome!"),
  Button({ onclick: () => alert("Clicked!") }, "Click Me")
);
```

---

### `Component`

Encapsulate UI logic and lifecycle.

```typescript
import { Component, html, render } from "@hellajs/core";

const { Div, Button } = html;

const Counter = Component(() => {
  const count = signal(0);

  return Div(
    Button({ onclick: () => count.set(count() - 1) }, "-"),
    " ",
    count,
    " ",
    Button({ onclick: () => count.set(count() + 1) }, "+")
  );
});

// Lifecycle hooks
Counter.onMount = () => console.log("Mounted!");
Counter.onUpdate = () => console.log("Updated!");
Counter.onUnmount = () => console.log("Unmounted!");

render(Counter);
```

---

### `For`

Keyed list rendering.

```typescript
import { html, For, signal } from "@hellajs/core";

const items = signal([1, 2, 3]);

const List = () =>
  html.ul(
    For(items, (item, i) =>
      html.li({ key: item }, `Item ${item}`)
    )
  );
```

---

### `context`, `consume`, `Provider`

Dependency injection for components.

```typescript
import { context, consume, Provider, Component, html, render } from "@hellajs/core";

const Theme = context("light");

const { Div } = html;

const Themed = Component(() =>
  Div("Theme: ", consume(Theme))
);

const App = Component(() =>
  Provider({
    context: Theme,
    value: "dark",
    children: [Themed]
  })
);

render(App);
```

---

### `render`

Mount your app to the DOM.

```typescript
import { html, render } from "@hellajs/core";

const { Div } = html;

render(Div("Hello, world!"), "#app");
```

---