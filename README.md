# HellaJS

A lightweight JavaScript framework for building reactive interfaces.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [Reactive Components](#reactive-components)
  - [State Management](#state-management)
  - [Routing](#routing)
  - [Resource Fetching](#resource-fetching)
- [Documentation](#documentation)
- [Examples](#examples)

## Features

- 🚀 **Fast DOM Updates** - Intelligent diffing with automatic batching
- 🎯 **Granular Reactivity** - Signal-based state with automatic dependency tracking
- 🔄 **State Management** - Type-safe stores with computed values and actions
- 🛣️ **Simple Router** - Pattern matching with params and lazy loading
- 🔗 **Resource Fetching** - Reactive data fetching with caching and retry logic
- 🔒 **Security First** - Built-in XSS protection and input sanitization
- 📦 **Tiny Bundle** - Full framework only under 8kB gzipped
- 🔍 **Type Safe** - Written in TypeScript with full type inference

## Installation

`npn install hellajs`

## Core Concepts

### Reactive Components

Components in Hella are plain objects that can be enhanced with reactivity. They automatically track signal dependencies and efficiently update only what changed.

Key features:

- Automatic dependency tracking
- Event delegation for better performance
- Proper cleanup of events and effects
- TypeScript support with element inference

```typescript
// Simple Counter Example
const count = signal(0);
const doubled = computed(() => count() * 2);

// Static typing with HellaElement
const Header: HellaElement<"header"> = {
  tag: "header",
  content: "Counter Example",
};

// Ergonomic HTML helpers
const { div, button, span } = html;

const Counter = div([
  button({ onclick: () => count.set(count() + 1) }, "Add"),
  span(`Count: ${count()}, Double: ${doubled()}`),
  button({ onclick: () => count.set(count() - 1) }, "Subtract"),
]);

// Cleanup is automatic when component unmounts
render(() => div([Header, Counter]), "#app");
```

### State Management

Manage complex application state with stores that support computed values, actions, and automatic updates.

```typescript
// Type-safe store with computed values
const todoStore = store(() => ({
  items: [],
  active: () => items().filter((todo) => !todo.completed),
  completed: () => items().filter((todo) => todo.completed),

  // Actions are automatically bound
  addTodo(text: string) {
    this.items.set([...this.items(), { text, completed: false }]);
  },

  toggleTodo(index: number) {
    const todos = [...this.items()];
    todos[index].completed = !todos[index].completed;
    this.items.set(todos);
  },
}));

// Use anywhere in your app
todoStore.addTodo("Learn Hella");
console.log(todoStore.active().length);
```

### Routing

Built-in router with pattern matching, params extraction, and navigation guards.

```typescript
// Setup routes with type-safe params
router.start({
  "/": () => render(Home),
  "/users/:id": ({ id }) => render(UserProfile, { id }),
  "/blog/*": ({ "*": path }) => render(BlogPost, { path }),

  // Async routes with code splitting
  "/admin": async () => {
    const { AdminPanel } = await import("./admin");
    return render(AdminPanel);
  },
});

// Navigation guards
beforeNavigate(["/admin"], () => {
  if (!isAdmin()) return "/login";
});
```

### Resource Fetching

Fetch and manage remote data with built-in caching and error handling.

```typescript
// Type-safe resource fetching
const users = resource<User[]>("/api/users", {
  cache: true,
  retries: 3,
  validate: (data): data is User[] => {
    return Array.isArray(data) && data.every(isUser);
  },
});

// Use in components
effect(() => {
  if (users.loading()) return "Loading...";
  if (users.error()) return "Error!";
  return users.data().map((user) => user.name);
});
```

## Documentation

For detailed documentation, check out:

- [Signals](docs/signals.md)
- [Render](docs/render.md)
- [Store](docs/store.md)
- [Router](docs/router.md)
- [Resource](docs/resource.md)

## Examples

Examples apps and core concepts:

- [Concepts](examples/concepts)
- [Apps](examples/apps)

`{ store }` **<6 kB** │ gzip: **<2.5 kB**

`{ router }` **<10.5 kB** │ gzip: **<4 kB**

`{ resource }` **<5 kB** │ gzip: **<2.5 kB**
