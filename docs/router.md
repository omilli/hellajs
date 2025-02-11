# Router API Reference

## Table of Contents

- [Overview](#overview)
  - [Features](#features)
  - [Router Types](#router-types)
- [API](#api)
  - [router](#router)
  - [Navigation](#navigation)
  - [Route Patterns](#route-patterns)
  - [Hooks](#hooks)
- [Technical Details](#technical-details)
  - [Route Matching](#route-matching)
  - [Navigation Pipeline](#navigation-pipeline)
  - [Security](#security)
  - [Performance](#performance)

## Overview

The router system provides client-side routing with pattern matching, parameter extraction, and event handling. It integrates deeply with Hella's reactive primitives while ensuring security and performance.

### Features

- Pattern-based routing
- Parameter extraction
- History management
- Navigation events
- Route cleanup
- Security controls
- TypeScript support
- Event hooks

### Router Types

```typescript
interface RouterState {
  currentPath: string; // Current URL path
  params: RouteParams; // Extracted parameters
  routes: Routes; // Route definitions
  currentCleanup: CleanupFunction | null; // Route cleanup
  history: string[]; // Navigation history
}

type RouteParams = Record<string, string>;
type RouteHandler = string | RouteHandlerFunction;
type Routes = Record<string, RouteHandler>;

type RouteHandlerFunction = (
  params: RouteParams
) => void | CleanupFunction | Promise<void | CleanupFunction>;
```

## API

### router()

Creates or retrieves the router instance with state management and navigation controls.

#### Examples

```typescript
// Initialize router
const app = router();

// Define routes
app.start({
  "/": () => render(HomePage),
  "/about": () => render(AboutPage),
  "/users/:id": ({ id }) => render(UserProfile, { id }),
  "/blog/*": ({ "*": path }) => render(BlogPost, { path }),
});

// Navigation
app.navigate("/about");
app.back();

// Event handling
app.on("beforeNavigate", (path) => showLoading());
app.on("afterNavigate", (path) => hideLoading());
```

### Navigation

1. **Basic Navigation**

```typescript
// Direct navigation
app.navigate("/users/123");

// Back navigation
app.back();
app.back("/fallback"); // With fallback

// History tracking
app.history(); // ["/", "/about", "/users/123"]
```

2. **Route Cleanup**

```typescript
app.start({
  "/dashboard": () => {
    setupDashboard();
    return () => cleanupDashboard(); // Called on route change
  },
});
```

### Route Patterns

1. **Static Routes**

```typescript
// Exact matches
"/about"; // Matches /about only
```

2. **Dynamic Parameters**

```typescript
// Named parameters
"/users/:id"; // Matches /users/123
"/posts/:category/:id"; // Matches /posts/tech/123

// Parameter extraction
app.start({
  "/users/:id/:tab?": ({ id, tab }) => {
    render(UserProfile, { id, tab });
  },
});
```

3. **Wildcard Routes**

```typescript
// Catch-all routes
"/blog/*"; // Matches /blog/2023/post-1

app.start({
  "/docs/*": ({ "*": path }) => {
    render(Documentation, { path });
  },
});
```

### Hooks

```typescript
// Navigation hooks
beforeNavigate(["/users/*"], (path) => {
  validateUser();
});

afterNavigate([], (path) => {
  analytics.pageView(path);
});
```

## Technical Details

### Route Matching

1. **Pattern Analysis**

   - Static path comparison
   - Parameter extraction
   - Wildcard matching
   - Regex validation

2. **Parameter Validation**

   ```typescript
   // Security checks
   validatePath("/users/123"); // true
   validatePath("javascript:alert()"); // false

   validateRouteParam("user-123"); // true
   validateRouteParam("<script>"); // false
   ```

### Navigation Pipeline

1. **Process Flow**

   - Rate limiting
   - Path validation
   - Hook execution
   - History update
   - Handler execution
   - Cleanup management

2. **Security Checks**

   ```typescript
   // Rate limiting
   maxNavigationRate = 1000 / 30; // 30 navigations per second

   // Redirect limits
   maxRedirects = 10; // Prevent infinite loops
   ```

### Security

1. **Path Protection**

   - URL validation
   - Parameter sanitization
   - Rate limiting
   - Redirect limits

2. **Event Safety**
   ```typescript
   // Event handler protection
   try {
     handler(path);
   } catch (err) {
     console.error(`Router event error: ${err}`);
   }
   ```

### Performance

1. **Navigation Optimization**

   - Path caching
   - History management
   - Event batching
   - Cleanup tracking

2. **Memory Management**
   - Route disposal
   - Event cleanup
   - History limits
   - Resource tracking
