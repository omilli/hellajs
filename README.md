# HellaJS

**A modern, fine-grained reactive UI library for the web.**

🌐 [HellaJS Documentation](https://hellajs.com)

![Static Badge](https://img.shields.io/badge/status-experimental-orange.svg)
[![Bundle Size](https://img.shields.io/bundlephobia/min/@hellajs/core)](https://bundlephobia.com/package/@hellajs/core)
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
    h1("Count: ", count),
    button({ onclick: () => count.set(count() + 1) }, "Increment")
  );
}

mount(Counter);
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

console.log(user.name()); // "Alice"
console.log(user.address.city()); // "NYC"

user.name.set("Bob");
user.address.city.set("LA");

user.update({ age: 31, address: { zip: "90001" } });
user.set({ name: "Eve", age: 22, address: { city: "SF", zip: "94101" } });

effect(() => {
  console.log("User:", user.computed());
});

user.name.set("Charlie"); // logs updated user object

user.cleanup();
```

---

### `html`

Ergonomic element factories.

```typescript
const { div, h1, button } = html;

const vnode = div(
  h1("Welcome!"),
  button({ onclick: () => alert("Clicked!") }, "Click Me")
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
    li({ key: item }, `Item ${item}`)
  )
);
```

---

### `show`

Conditional rendering.

```typescript
const { div } = html;
const visible = signal(true);

const App = div(
  show(visible, () => div("Visible!"), () => div("Hidden!"))
);
```

---

### `mount`

Mount your app to the DOM.

```typescript
const { div } = html;

mount(div("Hello, world!"));
```

---

## License

MIT
