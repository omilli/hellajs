# HellaJS Router

⮺ [Router Docs](https://hellajs.com/packages/router/router)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/router)](https://www.npmjs.com/package/@hellajs/router)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/router@latest)](https://bundlephobia.com/package/@hellajs/router)


```bash
npm install @hellajs/router
```

## Client-side Routing

`@hellajs/router` provides a lightweight, reactive routing system with hooks.


```ts
import { effect } from '@hellajs/core';
import { route, router } from '@hellajs/router';
import { Page } from './Page';

const appRouter = router({
  '/': () => Page('Home'),
  '/about': () => Page('About'),
  '/users/:id': (params) => Page(`User: ${params.id}`),
  '/old-path': '/new-path'
}, {
  before: () => console.log('Route changing'),
  after: () => console.log('Route changed'),
  '404': () => Page('Not Found')
});

effect(() => {
  const r = route();
  console.log("Current path:", r.path);
  console.log("Params:", r.params);
  console.log("Query:", r.query);
});

navigate('/');

```

### Routing Modes

[`router`](https://www.hellajs.com/packages/router/router/) supports two fundamental navigation modes:

1. **History Mode** - Uses the History API for clean URLs without hash fragments
2. **Hash Mode** - Uses URL hash fragments, ideal for static hosting without server configuration

Routers automatically synchronize their internal state with the browser's navigation events, ensuring consistency between the URL and your application state.

### Pattern Matching System

[`route`](https://www.hellajs.com/packages/router/route/) patterns are matched using a sophisticated algorithm that:

1. Splits paths into segments for precise matching
2. Extracts dynamic parameters from URL paths
3. Supports wildcard segments for catch-all routes
4. Handles query string parsing automatically

Parameter segments (prefixed with `:`) capture portions of the URL path, making them available to route handlers. Wildcards (`*`) capture all remaining segments, enabling flexible route structures.

### Navigation Pipeline

When you [`navigate`](https://www.hellajs.com/packages/router/navigate/) to a new route, the router follows a systematic process:

1. Updates the browser URL using either history or hash mode
2. Checks for potential redirects in global and route-specific definitions
3. Matches the current path against defined route patterns
4. Extracts parameters and query values from the URL
5. Executes the appropriate lifecycle hooks
6. Invokes the matched route handler with extracted data

This orchestrated sequence ensures predictable navigation behavior across your application.

### Lifecycle Hooks

The router implements a comprehensive hooks system:

1. **Global Before** - Executes before any route change
2. **Route-specific Before** - Runs before a specific route handler
3. **Route Handler** - The main route functionality
4. **Route-specific After** - Executes after a specific route handler completes
5. **Global After** - Runs after any route change completes
6. **Not Found (404)** - Handles paths that don't match any defined routes

These hooks create a predictable flow of execution during navigation, enabling cross-cutting concerns like authentication, analytics, and transitions.

### Redirection System

Two levels of redirection are supported:

1. **Global Redirects** - Applied before route matching begins
2. **Route Map Redirects** - Defined as string values in the route map

Redirects can transform URLs or completely change the navigation target, allowing for flexible URL structures and backwards compatibility with legacy routes.

### Integration with Reactivity

The router is designed to work seamlessly with HellaJS's reactivity system:

1. Route changes trigger UI updates through the signal system
2. Navigation can be triggered from any component
3. Route parameters and query values can be used in reactive computations

This integration creates a cohesive developer experience when building navigable applications, with routing that feels like a natural extension of the reactivity model.