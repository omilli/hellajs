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
- [routerGuard(paths, guard) => RouterGuardResult)](#routerguardpaths-guard)
  - [Parameters](#parameters-2)
  - [Examples](#examples-3)
- [routerRedirect(from, to)](#routerredirectfrom-to)
  - [Parameters](#parameters-3)
  - [Examples](#examples-4)

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

## routerGuard(paths, guard)

Protects routes with validation logic.

### Parameters

- `paths`: Array of route patterns to guard
- `guard`: Guard function returning result
  ```typescript
  interface RouterGuardResult {
    allowed: boolean;
    redirectTo?: string;
  }
  ```

### Examples

```typescript
// Auth guard
routerGuard(["/admin", "/settings"], () => ({
  allowed: isAuthenticated(),
  redirectTo: "/login",
}));

// Role guard
routerGuard(["/admin/*"], () => ({
  allowed: hasRole("admin"),
  redirectTo: "/unauthorized",
}));

// Complex guard
routerGuard(["/checkout/*"], () => {
  const cartValid = validateCart();
  const userLoggedIn = checkAuth();

  return {
    allowed: cartValid && userLoggedIn,
    redirectTo: !userLoggedIn ? "/login" : "/cart",
  };
});
```

## routerRedirect(from, to)

Defines route redirects.

### Parameters

- `from`: Source route pattern(s)
- `to`: Target route path

### Examples

```typescript
// Basic redirect
routerRedirect("/old-path", "/new-path");

// Multiple source paths
routerRedirect(["/legacy", "/deprecated"], "/new-feature");

// Wildcard redirects
routerRedirect("/v1/*", "/v2/*");
routerRedirect("/blog/*", "/articles/*");

// Parameter preservation
routerRedirect("/user/:id/*", "/profile/:id/*");

// Multiple related redirects
["/blog", "/articles", "/posts"].forEach((path) =>
  routerRedirect(path + "/:slug", "/content/:slug")
);
```
