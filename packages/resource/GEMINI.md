# Resource Package

Reactive async data fetching with intelligent caching, request deduplication, and abort control.

## Architecture Overview

### Mental Model

The system provides **cache-first reactive data fetching** without manual cache invalidation:
- **Resource**: Reactive container with loading/error/data states
- **Cache**: Global TTL-based cache with LRU eviction
- **Deduplication**: Shared promises for concurrent identical requests
- **Abort**: Fine-grained cancellation with external signal support
- **Mutations**: Promise-based writes with optimistic update hooks

### Key Components

- **resource.ts**: Core resource factory, fetch orchestration, abort handling
- **cache.ts**: Global cache with LRU eviction, TTL expiration, batch operations
- **types.ts**: TypeScript interfaces and type utilities

## Key Data Structures

**Resource**
```typescript
{
  data: () => T | undefined           // Reactive cached data
  error: () => ResourceError | undefined  // Structured error info
  loading: () => boolean              // Request in-flight state
  status: () => ResourceStatus        // Computed: idle|loading|success|error
  get(): void                         // Cache-first fetch
  request(): void                     // Force fresh fetch
  abort(): void                       // Cancel and reset
  invalidate(): void                  // Clear cache and refetch
  setData: (T | (old => T)) => void   // Update cached value
  cacheKey: () => unknown             // Current cache key
  mutate: (vars) => Promise<T>        // Execute mutation
  reset(): void                       // Return to initial state
}
```

**CacheEntry**
```typescript
{
  data: T                  // Cached value
  timestamp: number        // Creation time for TTL
  cacheTime: number        // TTL duration in ms
  lastAccess: number       // Last read time for LRU
}
```

**OngoingRequest** (deduplication map)
```typescript
{
  promise: Promise<T>                    // Shared fetch promise
  abortController: AbortController       // Shared abort control
  subscribers: Set<(result, error) => void>  // Waiting resources
}
```

## Key Algorithms

### Cache-First Fetch (run function)

**Purpose**: Orchestrate cache lookup, deduplication, and request execution

**Strategy**: Three-phase waterfall with early exits
1. **Cache phase**: Check TTL-valid cached data, return immediately if hit
2. **Deduplication phase**: Join ongoing request if same key, share abort controller
3. **Request phase**: Create AbortController, race fetcher vs abort, cache result

**Critical insight**: Uses untracked() when resolving key to prevent creating reactive dependencies during fetch execution

### Request Deduplication

**Purpose**: Prevent duplicate concurrent network calls for identical keys

**Strategy**: Global map tracks ongoing requests
- First request creates entry with promise, abortController, subscribers Set
- Subsequent requests with same key join existing promise
- All subscribers switch to shared abortController
- Promise completion notifies all subscribers and cleans up map entry
- Force refresh (request vs get) bypasses deduplication

**Why important**: Eliminates thundering herd when multiple components mount simultaneously requesting same data

### Abort Handling

**Purpose**: Cancellable async operations with graceful state management

**Strategy**: Promise.race with AbortSignal
- Create AbortController per request, store as currentAbortController
- External abortSignal listeners added to internal controller
- Timeout creates timer that calls abort(), clears on abort event
- Fetcher races against abort promise that rejects with DOMException
- AbortError caught specially: sets loading=false WITHOUT error state
- Signal captured before async to prevent race conditions

**Edge cases**: Already-aborted external signal, timeout during deduplication, abort during mutation

### LRU Cache Eviction

**Purpose**: Bound memory usage while keeping hot data

**Strategy**: Lazy eviction on cache write
- Check size > maxSize after setCacheData
- Calculate entriesToEvict = size - maxSize
- Sort all entries by lastAccess ascending
- Delete oldest entriesToEvict entries
- getCacheData updates lastAccess on read

**Performance**: O(n log n) sort only when eviction needed, throttled cleanup batches 100 entries

### Auto-Fetch System

**Purpose**: Automatic refetch when reactive dependencies change

**Strategy**: Effect tracks key function
- cleanupEffect stores previous effect disposer
- Effect runs when auto=true and enabled=true
- Effect body calls resolveKey() to track dependencies
- Dependency change triggers run(false) for cache-first fetch
- Disabled by default to prevent unexpected network calls

**Critical detail**: Key resolved with untracked() during actual fetch to avoid double-tracking

## Performance Patterns

### Hot Path Optimizations

1. **Early cache returns**: Single map lookup, no promise allocation
2. **Deduplication map reuse**: Shared promise reduces fetch overhead
3. **Throttled cleanup**: 60s minimum interval, 100 entry batch limit
4. **Lazy LRU eviction**: Only sort on exceeding maxSize
5. **Signal capture**: Prevents race checking signal.aborted multiple times

### Memory Management

- Global cache shared across all resource instances
- LRU eviction enforces maxSize boundary
- Deduplication map auto-cleans on promise settlement
- Effect cleanup on resource recreation
- AbortController cleanup via event listeners

## Non-Obvious Behaviors

- **get vs request**: get checks cache first, request bypasses with force=true flag
- **AbortError doesn't set error state**: Keeps status="idle" not "error"
- **Deduplication switches abort controller**: Later requests adopt ongoing controller
- **Auto-fetch disabled by default**: Prevents unexpected network on creation
- **Mutations bypass cache/deduplication**: Always execute fresh
- **setData with cacheTime=0 does nothing**: No cache writes when caching disabled
- **resolveKey handles both function and value**: typeof check for (() => K) | K overload
- **Status computation checks initialData**: Remains "idle" until different value
- **Force request still uses deduplication map**: Registers promise but doesn't check for existing
- **Cleanup throttling uses closure variable**: lastCleanupTime outside function for persistence
- **createInvalidator executes immediately**: Name misleading, doesn't return function
- **onSettled called on mutation abort**: If abort happens after onMutate, onSettled still fires
- **External abort and timeout compose**: Both listen to same internal AbortController
- **Cache entries survive resource disposal**: Global cache outlives individual resource instances
- **updateCacheData returns false on miss**: Indicates update failed, useful for conditional logic
- **LRU sorts entire cache**: No heap/tree optimization, acceptable for configured limits
- **Promise.race abort pattern**: Reject promise wraps abort listener to propagate cancellation
