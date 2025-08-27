# @hellajs/router

⮺ [Documentation](https://hellajs.com/reference/router/router)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/router)](https://www.npmjs.com/package/@hellajs/router)
![Bundle Size](https://edge.bundlejs.com/badge?q=@hellajs/router@0.14.8&treeshake=[*])

```bash
npm install @hellajs/router
```

## Overview

`@hellajs/router` is a lightweight, reactive client-side router for HellaJS. It provides declarative routing with dynamic parameters, lifecycle hooks, redirects, and seamless integration with reactive state.

## Features

- **Reactive**: Built on HellaJS signals for automatic UI updates.
- **TypeScript**: Full type safety with parameter inference.
- **Lightweight**: Minimal bundle size with tree-shaking support.
- **Flexible**: Support for dynamic parameters (`:id`) and wildcards (`*`).
- **Nested Routes**: Hierarchical route structures with parameter inheritance.
- **History & Hash Modes**: Choose between History API and hash-based routing.
- **Lifecycle Hooks**: Global and route-specific hooks (`before`, `after`).
- **Redirects**: Declarative redirects for legacy paths.
- **Not Found Handling**: Configurable handler for unmatched routes.

## Quick Start

```typescript
import { effect } from '@hellajs/core';
import { router, route, navigate } from '@hellajs/router';

// 1. Define routes using the new config object
const appRouter = router({
  routes: {
    '/' : () => renderView('Home'),
    '/users/:id': (params) => renderView(`User ${params.id}`),
    '/old-path': '/new-path', // Redirect
  },
  hash: false, // Use history mode (default)
  hooks: {
    before: () => console.log('Before navigation'),
    after: () => console.log('After navigation')
  },
  redirects: [{ from: ['/legacy'], to: '/new-legacy' }],
  notFound: () => renderView('Not Found')
});

// 2. React to route changes
effect(() => {
  const { path, params } = route();
  console.log(`Navigated to: ${path}`, { params });
});

// 3. Navigate programmatically
navigate('/users/:id', { id: '123' }, { tab: 'profile' });
```

## API Reference

### `router(config)`
Initializes the router with route definitions and global configuration.

```typescript
router({
  routes: {
    '/': () => { /* ... */ },
    '/about': () => { /* ... */ }
  },
  hash: false, // Use history mode (default)
  hooks: {
    before: () => console.log('Route changing...'),
    after: () => console.log('Route changed.')
  },
  redirects: [{ from: ['/old'], to: '/new' }],
  notFound: () => { /* ... */ }
});
```

### `route()`
A reactive signal containing the current route information (`path`, `params`, `query`, `handler`).

```typescript
import { computed } from '@hellajs/core';
import type { RouteInfo } from '@hellajs/router';

const pageTitle = computed(() => `App | ${(route() as RouteInfo).path}`);
```

### `navigate(pattern, params?, query?, opts?)`
Programmatically navigates to a new route.

```typescript
// Navigate to /users/456?tab=profile (pattern substitution)
navigate('/users/:id', { id: '456' }, { tab: 'profile' });
```

## Usage

- **Dynamic Parameters**: Use `:param` to capture URL segments (e.g., `/users/:id`).
- **Wildcard Routes**: Use `*` to capture all remaining path segments (e.g., `/files/*`).
- **Nested Routes**: Organize routes hierarchically with automatic parameter inheritance.
- **Query Parameters**: Query strings are automatically parsed and available in the `route().query` object and handler arguments.
- **Route Guards**: Use the `before` hook on a route definition to implement guards and perform actions like authentication checks or logging.

## Nested Routes

Create hierarchical route structures with automatic parameter inheritance:

```typescript
router({
  routes: {
    '/admin': {
      handler: () => renderAdminDashboard(),
      children: {
        '/users': {
          handler: () => renderUsersList(),
          children: {
            '/:id': (params) => renderUserDetail(params.id)
          }
        }
      }
    }
  }
});

// All of these routes work:
// /admin -> renderAdminDashboard()
// /admin/users -> renderUsersList()  
// /admin/users/123 -> renderUserDetail('123')
```

Nested routes support:
- **Parameter inheritance**: Child routes inherit parameters from parent routes
- **Hook cascading**: Parent hooks run before child hooks in proper order
- **Fallback handling**: Parent routes can serve as fallbacks for unmatched child routes

## TypeScript Support

The router provides full TypeScript support with automatic type inference for route parameters.

```typescript
import type { RouteInfo } from '@hellajs/router';

// params.id is automatically typed as string
router({
  routes: {
    '/users/:id': (params) => console.log(params.id)
  }
});

// Access strongly-typed route info
effect(() => {
  const currentRoute: RouteInfo = route();
});
```

## License

MIT