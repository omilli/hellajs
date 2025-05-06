# HellaJS

**A JS-first UI library for modern web apps.**

🌐 [HellaJS Documentation](https://hellajs.com)

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
[![Bundle Size](https://img.shields.io/bundlephobia/min/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/omilli/6df7884e21572b4910c2f21edb658e56/raw/hellajs-coverage.json)


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
import { html, render, signal, component } from "@hellajs/core";

const { div, button, H1 } = html;

const count = signal(0);

const Counter = component(() =>
  div(
    H1("Count: ", count),
    button({ onclick: () => count.set(count() + 1) }, "Increment")
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

const { div, h1, button } = html;

const vnode = div(
  h1("Welcome!"),
  button({ onclick: () => alert("Clicked!") }, "Click Me")
);
```
---

### `component`

Isolate state and reactivity.

```typescript
import { html, signal, effect, component, render } from "@hellajs/core";

const { div, button } = html;

const Timer = component(() => {
  const count = signal(0);
  const interval = setInterval(() => count.set(count() + 1), 1000);

  effect(() => {
    console.log("Timer:", count());
  });

  const vnode = div(
    "Timer: ", count,
    button({ onclick: () => vnode.cleanup?.() }, "Stop Timer")
  );

  vnode.cleanup = () => clearInterval(interval);
  return vnode;
});

// Create an instance and mount it
const timerInstance = Timer();
render(timerInstance);

// Cleanup after 5 seconds
setTimeout(() => {
  timerInstance.cleanup?.();
}, 5000);

```


---

### `list`

Keyed list rendering.

```typescript
import { html, list, signal } from "@hellajs/core";


const { ul, li } = html;

const items = signal([1, 2, 3]);

const List = ul(
  list(items, (item, i) =>
    li({ key: item }, `Item ${item}`)
  )
)
```

---

### `render`

Mount your app to the DOM.

```typescript
import { html, render } from "@hellajs/core";

const { div } = html;

render(div("Hello, world!"), "#app");
```

---