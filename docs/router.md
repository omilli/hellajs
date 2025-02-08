# Router API Reference

Client-side routing with guards and hooks.

## Index

- [router()](#router)
  - [Methods](#methods)
  - [Examples](#examples)
  - [Route Parameters](#route-parameters)
    ```typescript
    interface RouteParams {
      [key: string]: string;
    }
    ```
- [beforeNavigate(paths: string[], callback: (path: string) => void)](#beforenavigatepaths-callback)
  - [Parameters](#parameters)
  - [Examples](#examples-1)
- [afterNavigate(paths, callback)](#afternavigatepaths-callback)
  - [Parameters](#parameters-1)
  - [Examples](#examples-2)

## router()

Creates a singleton router instance for managing application routes.

### Methods

- `start(routes)`: Initialize router with route definitions
- `navigate(path)`: Navigate to specified path
- `back(fallbackPath?)`: Navigate to previous route
- `currentPath`: Signal for current route path
- `params`: Signal for route parameters

### Examples

```typescript
// Basic routing
const routes = {
  "/": () => renderHome(),
  "/users": () => renderUsers(),
  "/users/:id": (params) => renderUser(params.id),
  "/about": "/company/about", // Route alias
};

const app = router();
app.start(routes);

// Navigation
app.navigate("/users/123");
app.back("/"); // Falls back to home if no history

// Route with cleanup
"/chat": () => {
  const cleanup = setupChat();
  return () => cleanup();
}
```

## beforeNavigate(paths, callback)

Executes before route changes.

### Parameters

- `paths`: Array of route patterns to watch
- `callback`: Function to execute before navigation
  ```typescript
  type NavigateCallback = (path: string) => void | boolean | Promise<void>;
  ```

### Examples

```typescript
// Global navigation hook
beforeNavigate([], (path) => {
  analytics.trackPageView(path);
});

// Route-specific hooks
beforeNavigate(["/checkout/*"], (path) => {
  if (!validateCart()) {
    return false; // Prevents navigation
  }
});

// Cleanup on unmount
const cleanup = beforeNavigate(["/chat"], () => {
  const connection = setupChat();
  return () => connection.close();
});
cleanup(); // Remove hook
```

## afterNavigate(paths, callback)

Executes after route changes.

### Parameters

- `paths`: Array of route patterns to watch
- `callback`: Function to execute after navigation
  ```typescript
  type NavigateCallback = (path: string) => void;
  ```

### Examples

```typescript
// Update page title
afterNavigate([], (path) => {
  document.title = generateTitle(path);
});

// Load data after navigation
afterNavigate(["/products/:id"], () => {
  const { id } = router().params();
  loadProductDetails(id);
});

// TypeScript with params
interface ProductParams {
  id: string;
  tab?: string;
}

afterNavigate<ProductParams>(["/products/:id"], (_, params) => {
  console.log(params.id); // Typed as string
});
```
