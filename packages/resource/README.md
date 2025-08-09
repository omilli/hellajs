# HellaJS Resource

⮺ [Resource Docs](https://hellajs.com/packages/resource/resource)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/resource)](https://www.npmjs.com/package/@hellajs/resource)
![Bundle Size](https://deno.bundlejs.com/badge?q=@hellajs/resource@0.14.0&treeshake=[*])


```bash
npm install @hellajs/resource
```

## Resource Management

`@hellajs/resource` provides a reactive data fetching abstraction that simplifies handling asynchronous operations, managing loading states, and implementing caching strategies.

```ts
import { signal, effect } from '@hellajs/core';
import { resource } from '@hellajs/resource';

const users = resource('https://api.example.com/users');

effect(() => {
  if (user.loading()) {
    console.log('Loading user data...');
  } else if (user.error()) {
    console.log('Failed to load user:', user.error());
  } else {
    console.log('User data:', user.data());
  }
});

user.fetch();  // Load with cache if available
user.request(); // Force fresh request
user.invalidate(); // Clear cache and reload
```

### Fetching Abstraction

The [resource](https://www.hellajs.com/packages/resource/resource/) function abstracts away the complexity of data fetching by encapsulating:

1. The fetch operation itself
2. Loading state management
3. Error handling
4. Data caching
5. Resource lifecycle management

When a resource is created, it doesn't immediately trigger a fetch operation. Instead, it establishes a reactive context that can be controlled programmatically.

### State Management

Resources maintain an internal reactive state using signals:

1. **Data State** - Holds the fetched data or initial data if provided
2. **Error State** - Contains any errors that occurred during fetching
3. **Loading State** - Tracks whether a fetch operation is in progress
4. **Status State** - Computed value representing the current resource state (idle, loading, success, error)

These internal states are exposed as computed signals, enabling UI components to render reactively based on the resource's current condition.

### Caching System

The resource package includes a sophisticated caching mechanism:

1. Resources can be configured with a cache duration
2. Cached results are stored in a global cache map with timestamps
3. When a resource is accessed, it first checks for valid cache entries
4. Cache invalidation happens automatically when the cache time expires
5. Manual cache invalidation is available when needed

This caching system prevents redundant network requests and improves application performance without sacrificing data freshness.

### Resource Keys and Dependencies

Resources accept a key signal that:

1. Determines the cache identity of the resource
2. Enables dynamic resource parameters
3. Allows dependent resources that update based on other states

The key signal runs outside of tracking contexts to prevent unintended reactivity cycles.

### Manual Control

While resources are reactive by nature, they also provide imperative controls:

1. **Fetch** - Retrieves data, using cache when available
2. **Request** - Forces a fresh fetch, bypassing cache
3. **Abort** - Cancels the current operation and resets states
4. **Invalidate** - Removes cache entries and requests fresh data

These controls provide developers fine-grained management of a resource while maintaining the benefits of reactivity.

### Error Handling

The resource system handles errors gracefully:

1. Errors during fetching are captured in the error state
2. Loading state is properly reset when errors occur
3. Optional error callbacks provide hooks for custom error handling
4. The resource status transitions to "error" for conditional UI rendering

This comprehensive error handling ensures applications remain stable even when network requests fail.

### Integration with Reactivity

Resources are designed to work seamlessly with HellaJS's reactivity system:

1. Resource states can be used in computed values and effects
2. Resources can depend on signals through their key functions
3. Resource state changes trigger appropriate UI updates
4. Resource cleanup happens automatically through effect disposal

This integration creates a cohesive developer experience when building data-driven applications.