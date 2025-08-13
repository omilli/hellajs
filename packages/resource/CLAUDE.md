# Script Instructions

Follow these instructions when working in this monorepo sub-folder. @hellajs/resource is the reactive data fetching system built on top of @hellajs/core.

## Structure
- `resource.ts` - Main resource implementation with caching and lifecycle management
- `types.ts` - TypeScript type definitions for resource interfaces and options
- `index.ts` - Package exports

## Approach

### Signal-Based State Management
- Each resource maintains four reactive signals: `data`, `error`, `loading`, and internal state tracking
- State signals are exposed as readonly computed values to prevent external mutation
- Status is derived from the combination of other signals using computed values
- All state changes flow through the reactive graph for automatic UI updates

### Manual Fetch Control Pattern
- Resources do not auto-fetch on creation, requiring explicit `.fetch()` or `.request()` calls
- This prevents unwanted network requests and gives developers full control over when data loads
- Effect system is present but used as no-op to maintain consistency with reactive patterns
- Abort mechanism uses simple boolean flag to prevent stale responses from updating state

### Global Cache with Key-Based Invalidation
- Single global `Map` stores cached responses keyed by the result of the `key()` function
- Cache entries include timestamp for TTL-based expiration using `cacheTime` option
- Cache lookup happens synchronously before async fetching to avoid unnecessary requests
- Key function executed in `untracked()` context to prevent reactive dependencies on cache operations

### Overloaded API with String URL Shorthand
- Two function overloads: string URLs for simple cases, custom fetcher functions for complex scenarios
- String URL internally converts to fetcher function that calls `fetch().then(r => r.json())`
- Options parameter shared between overloads with key function defaulting to URL string for simple cases
- TypeScript generics infer return types from fetcher function promises

### Async State Coordination with Abort Handling
- Loading state set before async operation begins, cleared when operation completes or errors
- Abort flag checked before each state update to prevent race conditions from stale requests
- Error and success callbacks fired after state updates when request completes successfully
- Cache updates happen before state updates to ensure consistency between cache and signals