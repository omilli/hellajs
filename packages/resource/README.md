# @hellajs/resource

⮺ [Documentation](https://hellajs.com/reference/resource/resource)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/resource)](https://www.npmjs.com/package/@hellajs/resource)
![Bundle Size](https://edge.bundlejs.com/badge?q=@hellajs/resource@0.14.6&treeshake=[*])

```bash
npm install @hellajs/resource
```

## Overview

`@hellajs/resource` is a reactive data fetching library for HellaJS. It provides caching, loading states, error handling, and seamless integration with `@hellajs/core`'s reactivity system.

## Features

- **Reactive State**: Signals for `data`, `loading`, `error`, and `status`.
- **Caching**: Built-in caching with configurable expiration (`cacheTime`).
- **Manual Fetching**: Resources do not auto-fetch; you control when requests happen.
- **Reactive Keys**: Resource fetching can depend on other signals.
- **Request Cancellation**: Abort in-flight requests.
- **TypeScript Support**: Full type inference for fetcher functions.

## Quick Start

```typescript
import { resource } from '@hellajs/resource';
import { effect, signal } from '@hellajs/core';

// 1. Define a resource with a fetcher function
const userId = signal(1);
const userResource = resource(
  (id: number) => fetch(`https://api.example.com/users/${id}`).then(r => r.json()),
  { key: () => userId() } // Make it reactive to userId changes
);

// 2. React to its state
effect(() => {
  console.log(`Status: ${userResource.status()}`);
  if (userResource.data()) {
    console.log('User:', userResource.data().name);
  }
});

// 3. Initiate the fetch
userResource.fetch();

// 4. Change the key and fetch again
userId(2);
userResource.fetch(); // Fetches user with ID 2
```

## API Reference

### `resource(fetcher, options?)`
Creates a resource that manages the state of an async operation.

```typescript
// Two overloads: custom fetcher or simple URL
resource<T, K>(fetcher: (key: K) => Promise<T>, options?: ResourceOptions<T, K>): Resource<T>;
resource<T>(url: string, options?: ResourceOptions<T, string>): Resource<T>;

// The returned resource has reactive properties.
interface Resource<T> {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<unknown>;
  loading: ReadonlySignal<boolean>;
  status: ReadonlySignal<"idle" | "loading" | "success" | "error">;
  fetch(): void;      // Fetch (uses cache)
  request(): void;    // Force fresh fetch
  abort(): void;      // Cancel and reset
  invalidate(): void; // Clear cache and refetch
}
```

## Usage

- **URL Overload**: For simple GET requests, you can pass a URL string directly: `resource('api/data')`.
- **Caching**: Set `cacheTime` in milliseconds to enable caching. Each unique key gets its own cache entry.
- **Mutations**: After a POST, PUT, or DELETE request, call `.invalidate()` on related resources to refetch fresh data.
- **Error Handling**: Use the `error()` signal or the `onError` callback to handle failed requests.

## TypeScript Support

The `resource` function provides full type inference from the fetcher's return type.

```typescript
interface User { id: number; name: string; }

// Type T is automatically inferred as User[]
const usersResource = resource(() => 
  fetch('/api/users').then(res => res.json() as Promise<User[]>)
);

// usersResource.data() is typed as User[] | undefined
const users = usersResource.data();
```

## License

MIT

## Overview

`@hellajs/resource` enables reactive data fetching with built-in state management, caching, and lifecycle control. Resources integrate seamlessly with HellaJS's reactive primitives, allowing you to build data-driven applications with automatic UI updates.

**Key Features:**
- 🔄 Reactive state management (data, loading, error, status)
- 💾 Built-in caching with configurable expiration
- 🎯 Manual fetch control - resources don't auto-fetch
- 🔑 Reactive keys for dynamic data dependencies  
- 🚫 Request cancellation and abort handling
- 📝 Full TypeScript support with type inference
- ⚡ Optimized for performance with minimal re-renders

## API Reference

### Two Function Overloads

```typescript
// Overload 1: Simple URL fetching
function resource<T>(url: string, options?: ResourceOptions<T, string>): Resource<T>;

// Overload 2: Custom fetcher function
function resource<T, K>(fetcher: (key: K) => Promise<T>, options?: ResourceOptions<T, K>): Resource<T>;
```

### ResourceOptions

```typescript
type ResourceOptions<T, K> = {
  key?: () => K;                    // Function to generate cache key
  enabled?: boolean;                // Whether resource is enabled (default: true)
  initialData?: T;                  // Initial data value
  cacheTime?: number;               // Cache duration in milliseconds
  onSuccess?: (data: T) => void;    // Success callback
  onError?: (err: unknown) => void; // Error callback
};
```

### Resource Interface

```typescript
interface Resource<T> {
  data: ReadonlySignal<T | undefined>;                           // Current data
  error: ReadonlySignal<unknown>;                                // Current error  
  loading: ReadonlySignal<boolean>;                              // Loading state
  status: ReadonlySignal<"idle" | "loading" | "success" | "error">; // Overall status
  fetch(): void;      // Fetch with caching
  request(): void;    // Force fresh fetch
  abort(): void;      // Cancel and reset
  invalidate(): void; // Clear cache and refetch
}
```

## Basic Usage

**Important: Resources do not auto-fetch on creation.** You must call `.fetch()` or `.request()` to start data loading.

```typescript
import { resource } from '@hellajs/resource';
import { effect } from '@hellajs/core';

// 1. Create the resource
const usersResource = resource<User[]>(() => 
  fetch('https://api.example.com/users').then(r => r.json())
);

// 2. React to state changes
effect(() => {
  console.log(`Status: ${usersResource.status()}`);
  
  if (usersResource.loading()) {
    console.log('Loading users...');
  } else if (usersResource.error()) {
    console.log('Error:', usersResource.error());
  } else if (usersResource.data()) {
    console.log('Users loaded:', usersResource.data().length);
  }
});

// 3. Initiate fetching
usersResource.fetch();
```

## TypeScript Support

The `resource` function provides full type inference from the fetcher's return type.

```typescript
interface User { id: number; name: string; email: string; }

// Type T is automatically inferred as User[]
const usersResource = resource(() => 
  fetch('/api/users').then(res => res.json() as Promise<User[]>)
);

// usersResource.data() is typed as User[] | undefined
const users = usersResource.data();
```

## URL Overload

For simple JSON APIs, use the URL string overload.

```typescript
// Equivalent to custom fetcher that calls fetch(url).then(r => r.json())
const apiResource = resource<ApiResponse>('https://api.example.com/data');

apiResource.fetch();
```

## Reactive Keys

Use the `key` option to create dynamic resources that depend on reactive state.

```typescript
import { signal } from '@hellajs/core';

const userId = signal(1);

const userResource = resource(
  (id: number) => fetch(`/api/users/${id}`).then(r => r.json()),
  { 
    key: () => userId() // Resource depends on userId signal
  }
);

// Fetch user 1
userResource.fetch();

// Change user and fetch again
userId(2);
userResource.fetch(); // Fetches user 2
```

## Caching

Enable caching by setting `cacheTime` in milliseconds. Each unique key gets its own cache entry.

```typescript
const postsResource = resource(
  (id: number) => fetch(`/api/posts/${id}`).then(r => r.json()),
  { 
    key: () => postId(),
    cacheTime: 60000 // Cache for 1 minute
  }
);

postsResource.fetch();   // Network request
postsResource.fetch();   // Returns cached data (if within 1 minute)
postsResource.request(); // Forces new network request
```

## Method Reference

### `.fetch()`
Fetches data using cache if available and not expired. Use this for normal data loading.

### `.request()` 
Forces a fresh network request, ignoring any cached data. Use for refreshing data.

### `.abort()`
Cancels any ongoing request and resets the resource to its initial state (using `initialData` if provided).

### `.invalidate()`
Clears the cache for the current key and immediately calls `.request()` to fetch fresh data.

## Data Mutations

After performing data mutations (POST, PUT, DELETE), invalidate related resources to fetch updated data.

```typescript
async function createUser(userData: CreateUserData) {
  // Perform the mutation
  const newUser = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  }).then(r => r.json());
  
  // Invalidate to get fresh data
  usersResource.invalidate();
  
  return newUser;
}
```

## Error Handling

Handle errors reactively using the `error` signal or `onError` callback.

```typescript
const apiResource = resource(
  () => fetch('/api/data').then(r => r.json()),
  {
    onError: (err) => {
      console.error('API request failed:', err);
      // Handle error (show notification, etc.)
    }
  }
);

// Or handle in effects
effect(() => {
  if (apiResource.error()) {
    // Handle error reactively
    showErrorNotification(apiResource.error());
  }
});
```

## Advanced Configuration

```typescript
const advancedResource = resource(
  (params: SearchParams) => searchAPI(params),
  {
    key: () => ({ query: searchQuery(), page: currentPage() }),
    enabled: true,                    // Resource is active
    initialData: { results: [] },     // Default data
    cacheTime: 5 * 60 * 1000,        // 5 minute cache
    onSuccess: (data) => {
      console.log('Search completed:', data.results.length);
    },
    onError: (err) => {
      logError('Search failed', err);
    }
  }
);
```

## Integration with @hellajs/core

Resources work seamlessly with all HellaJS reactive primitives.

```typescript
import { signal, computed, effect } from '@hellajs/core';

const filter = signal('active');
const todosResource = resource(
  (status: string) => fetch(`/api/todos?status=${status}`).then(r => r.json()),
  { 
    key: () => filter(),
    cacheTime: 30000 
  }
);

// Computed values react to resource state
const todoCount = computed(() => todosResource.data()?.length ?? 0);

// Effects automatically re-run when resource state changes  
effect(() => {
  if (todosResource.status() === 'success') {
    updateUI(todosResource.data());
  }
});

// Changing filter automatically enables fetching new data
filter('completed');
todosResource.fetch(); // Fetches completed todos
```

## Status States

The `status` signal provides a computed state based on the resource's current condition.

- **`"idle"`** - Resource created but no data fetched yet, or reset to initial state
- **`"loading"`** - Fetch operation in progress
- **`"success"`** - Data successfully loaded and available
- **`"error"`** - An error occurred during fetching