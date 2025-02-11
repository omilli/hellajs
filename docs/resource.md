# Resource API Reference

## Table of Contents

- [Overview](#overview)
  - [Features](#features)
  - [Resource Types](#resource-types)
- [API](#api)
  - [resource](#resource)
  - [Examples](#examples)
- [Technical Details](#technical-details)
  - [Caching](#caching)
  - [Request Management](#request-management)
  - [Error Handling](#error-handling)
  - [Performance](#performance)
  - [Security](#security)

## Overview

The resource system provides a reactive data fetching solution with built-in caching, retries, and request management. It seamlessly integrates with Hella's reactive primitives while ensuring performance and security.

### Features

- Automatic caching with TTL
- Request deduplication
- Retry mechanism
- Request cancellation
- Pool size limits
- Request timeouts
- Response validation
- Data transformation
- TypeScript support

### Resource Types

```typescript
interface ResourceOptions<T> {
  transform?: (data: T) => T; // Transform response data
  onError?: (res: Response) => void; // Custom error handler
  cache?: boolean; // Enable caching
  cacheTime?: number; // Cache duration in ms
  timeout?: number; // Request timeout
  retries?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries
  validate?: (data: T) => boolean; // Validate response data
  poolSize?: number; // Max concurrent requests
}

interface ResourceResult<T> {
  data: Signal<T | undefined>; // Resource data
  loading: Signal<boolean>; // Loading state
  error: Signal<Error | undefined>; // Error state
  fetch: () => Promise<void>; // Trigger fetch
  abort: () => void; // Cancel request
  refresh: () => Promise<void>; // Force refresh
  invalidate: () => void; // Clear cache
}
```

## API

### resource(input, options?)

Creates a resource instance for managing async data fetching.

#### Parameters

- `input`: URL string or promise-returning function
- `options`: Optional ResourceOptions object

#### Returns

ResourceResult object containing signals and control methods

#### Examples

```typescript
// Basic URL fetch
const users = resource("/api/users");
users.data(); // undefined
await users.fetch(); // Triggers fetch
users.data(); // User data

// With options
const posts = resource("/api/posts", {
  cache: true,
  cacheTime: 60000, // 1 minute
  retries: 3,
  validate: (data) => Array.isArray(data),
});

// Custom fetcher
const profile = resource(() => fetchGraphQL(`{ user { id name } }`), {
  transform: (data) => data.user,
  onError: (res) => logError(res),
});

// Response transformation
const items = resource("/api/items", {
  transform: (data) => data.map(formatItem),
  validate: (data) => data.every(isValidItem),
});

// Manual control
const data = resource("/api/data");
data.fetch(); // Start fetch
data.abort(); // Cancel
data.refresh(); // Force refresh
data.invalidate(); // Clear cache

// TypeScript usage
interface User {
  id: number;
  name: string;
}

const users = resource<User[]>("/api/users", {
  validate: (users): users is User[] => {
    return users.every((u) => isUser(u));
  },
});
```

## Technical Details

### Caching

1. **Cache Strategy**

   ```typescript
   // Automatic caching
   const cached = resource(url, {
     cache: true,
     cacheTime: 300000, // 5 minutes
   });

   // Manual control
   cached.invalidate(); // Clear cache
   cached.refresh(); // Force refresh
   ```

2. **Cache Operations**
   - In-memory Map storage
   - TTL-based expiration
   - Automatic invalidation
   - Manual control

### Request Management

1. **Pool Control**

   - Max concurrent requests
   - Request deduplication
   - Automatic cleanup
   - AbortController integration

2. **Retry Logic**
   ```typescript
   const resilient = resource(url, {
     retries: 3,
     retryDelay: 1000,
     onError: (res) => {
       if (res.status === 401) {
         refreshToken();
       }
     },
   });
   ```

### Error Handling

1. **Error Types**

   - Network errors
   - Timeout errors
   - Validation errors
   - Abort errors

2. **Recovery**
   ```typescript
   const safe = resource(url, {
     validate: (data) => {
       if (!isValid(data)) {
         return false; // Triggers error
       }
       return true;
     },
     transform: (data) => {
       return sanitize(data); // Clean data
     },
   });
   ```

### Performance

1. **Request Optimization**

   - Response caching
   - Request deduplication
   - Batched updates
   - Memory management

2. **Resource Management**
   - Request pooling
   - Cache cleanup
   - Signal disposal
   - Memory limits

### Security

1. **Request Protection**

   - URL validation
   - Response sanitization
   - Size limits
   - Timeout controls

2. **Data Validation**

   - Schema validation
   - Type checking
   - XSS prevention
   - Input sanitization

3. **Resource Limits**
   - Pool size control
   - Retry limits
   - Cache size
   - Request timeouts
