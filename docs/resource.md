# Resource API Reference

Reactive resource management for async data fetching.

## Index

- [resource(input, options?)](#resourceinput-options)
  - [Parameters](#parameters)
  - [Returns](#returns)
  - [Examples](#examples)

## resource(input?, options?)

Creates a reactive resource for managing async data with loading and error states.

### Parameters

- `input`: URL string or promise function
- `options`: Optional configuration object
  ```typescript
  interface ResourceOptions<T> {
    transform?: (data: T) => T;
    onError?: (response: Response) => void;
  }
  ```

### Returns

```typescript
interface ResourceResult<T> {
  data: Signal<T | undefined>;
  loading: Signal<boolean>;
  error: Signal<Error | undefined>;
  fetch: () => Promise<void>;
}
```

### Examples

```typescript
// Basic usage with URL
const users = resource("/api/users");
effect(() => {
  if (users.loading()) console.log("Loading...");
  if (users.error()) console.log("Error:", users.error());
  if (users.data()) console.log("Data:", users.data());
});
users.fetch();

// With promise function
const fetchData = () => fetch("/api/data").then((r) => r.json());
const data = resource(fetchData);

// With data transformation
const posts = resource("/api/posts", {
  transform: (data) =>
    data.map((post) => ({
      ...post,
      date: new Date(post.date),
    })),
});

// With error handling
const protected = resource("/api/protected", {
  onError: (response) => {
    if (response.status === 401) {
      redirect("/login");
    }
  },
});

// TypeScript usage
interface User {
  id: number;
  name: string;
  email: string;
}

const users = resource<User[]>("/api/users");
effect(() => {
  const data = users.data();
  if (data) {
    // TypeScript knows data is User[]
    data.forEach((user) => console.log(user.name));
  }
});

// Composing with other reactive primitives
const userId = signal<number | null>(null);
const userProfile = resource<User>();

effect(() => {
  const id = userId();
  id && userProfile.fetch(`/api/users/${id}`);
});

// Manual data updates
const todos = resource<Todo[]>("/api/todos");
todos.data.set([...todos.data(), newTodo]);

// Reset states
todos.data.set(undefined);
todos.error.set(undefined);
todos.loading.set(false);
```
