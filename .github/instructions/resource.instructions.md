---
applyTo: "packages/resource/**"
---

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
- **SWR**: Stale-while-revalidate pattern for background refresh

### Key Components

- **resource.ts**: Core resource factory, fetch orchestration, abort handling, retry, polling
- **cache.ts**: Global cache with LRU eviction, TTL/staleTime, batch operations, network status
- **types.ts**: TypeScript interfaces and type utilities

## Key Data Structures

**Resource**
```typescript
{
  data: () => TTransformed | undefined    // Reactive cached data (transformed if transform used)
  error: () => ResourceError | undefined  // Structured error info
  isLoading: () => boolean                // True only for initial load (no data yet)
  isFetching: () => boolean               // True for any network activity
  isIdle: () => boolean                   // True if never fetched
  status: () => ResourceStatus            // Computed: idle|loading|success|error
  fetch(options?): void                  // Cache-first fetch (force: true bypasses cache)
  abort(): void                           // Cancel and reset
  invalidate(): void                      // Clear cache and refetch
  setData: (T | (old => T)) => void       // Update cached value (raw type)
  cacheKey: () => unknown                 // Current cache key
  mutate: <TVariables>(vars) => Promise<T>// Execute mutation (returns raw type)
  reset(): void                           // Return to initial state
  dispose(): void                         // Cleanup effects/timers/subscriptions
}
```

**CacheEntry**
```typescript
{
  data: T                  // Cached value
  timestamp: number        // Creation time for TTL
  cacheTime: number        // TTL duration in ms
  staleTime: number        // Fresh duration in ms (Infinity = never stale)
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

**Purpose**: Orchestrate cache lookup, deduplication, SWR, and request execution

**Strategy**: Three-phase waterfall with early exits
1. **Cache phase**: Check TTL-valid cached data, return immediately if hit
2. **SWR phase**: If staleTime configured and data is stale, return cached + background fetch
3. **Deduplication phase**: Join ongoing request if same key, share abort controller
4. **Request phase**: Create AbortController, race fetcher vs abort, cache result

**Critical insight**: Uses untracked() when resolving key to prevent creating reactive dependencies during fetch execution

### Stale-While-Revalidate (SWR)

**Purpose**: Return stale data immediately while fetching fresh data in background

**Strategy**: Time-based freshness check
- `staleTime`: Duration data is considered fresh (default: Infinity)
- `cacheTime`: Duration data stays in cache (default: 0)
- When stale: `fetch()` returns cached data + triggers background fetch
- `isFetching` = true during background refresh, `isLoading` = false (has data)

```typescript
// Timeline example with staleTime: 30000, cacheTime: 300000
// 0-30s: Fresh - instant return
// 30s-5min: Stale - return + background fetch
// 5min+: Expired - fresh network request
```

### Retry Logic

**Purpose**: Automatic retry on failure with configurable strategies

**Strategy**: Loop with delay and conditional checks
- `retry`: Number, boolean, or `(count, error) => boolean`
- `retryDelay`: Number or `(attempt, error) => number`
- Abort during retry delay: Checks signal and exits cleanly
- Retry count resets between requests

```typescript
// Exponential backoff example
retry: 3,
retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt - 1), 30000)
```

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

**Edge cases**: Already-aborted external signal, timeout during deduplication, abort during mutation, abort during retry delay

### Polling / Interval Refetch

**Purpose**: Periodic data refresh for real-time updates

**Strategy**: Recursive setTimeout with visibility awareness
- `refetchInterval`: Number, false, or `(data) => number | false`
- `refetchIntervalInBackground`: Continue when tab hidden (default: false)
- Skipped execution when tab hidden (unless background enabled)
- Cleanup on dispose/abort/reset

### Window Focus / Reconnect

**Purpose**: Refetch on user attention or network recovery

**Strategy**: Global event listeners
- `refetchOnWindowFocus`: visibilitychange listener
- `refetchOnReconnect`: Uses resourceCache.onOnlineChange
- Cleanup on dispose

### LRU Cache Eviction

**Purpose**: Bound memory usage while keeping hot data

**Strategy**: Lazy eviction on cache write
- Check size > maxSize after setCacheData
- Calculate entriesToEvict = size - maxSize
- Sort all entries by lastAccess ascending
- Delete oldest entriesToEvict entries
- getCacheData updates lastAccess on read

**Performance**: O(n log n) sort only when eviction needed, throttled cleanup batches 100 entries

### Data Transformation

**Purpose**: Transform data before returning while caching raw data

**Strategy**: Computed signal wrapper
- `transform`: `(data: T) => TTransformed`
- Cache stores raw data (T)
- `data()` returns transformed (TTransformed)
- `setData` and `mutate` work with raw type (T)

**Why important**: Multiple resources with different transforms can share cache

## Performance Patterns

### Hot Path Optimizations

1. **Early cache returns**: Single map lookup, no promise allocation
2. **Deduplication map reuse**: Shared promise reduces fetch overhead
3. **Throttled cleanup**: 60s minimum interval, 100 entry batch limit
4. **Lazy LRU eviction**: Only sort on exceeding maxSize
5. **Signal capture**: Prevents race checking signal.aborted multiple times
6. **Computed transform**: Applied on read, always fresh

### Memory Management

- Global cache shared across all resource instances
- LRU eviction enforces maxSize boundary
- Deduplication map auto-cleans on promise settlement
- Effect cleanup on resource recreation via dispose()
- AbortController cleanup via event listeners
- Polling/focus/reconnect listeners cleaned on dispose()

## Non-Obvious Behaviors

- **fetch vs fetch({ force: true })**: Default checks cache first, force bypasses cache
- **AbortError doesn't set error state**: Keeps status="idle" not "error"
- **Deduplication switches abort controller**: Later requests adopt ongoing controller
- **Auto-fetch disabled by default**: Prevents unexpected network on creation
- **Mutations bypass cache/deduplication**: Always execute fresh
- **setData with cacheTime=0 does nothing**: No cache writes when caching disabled
- **resolveKey handles both function and value**: typeof check for (() => K) | K overload
- **enabled is not reactive**: Evaluated once at creation time, stored as static boolean
- **Status computation checks initialData**: Remains "idle" until different value
- **Force fetch still uses deduplication map**: Registers promise but doesn't check for existing
- **Cleanup throttling uses closure variable**: lastCleanupTime outside function for persistence
- **invalidateResources executes immediately**: Invalidates all provided resources in batch
- **onSettled NOT called on mutation abort**: If mutation is aborted, onSettled is skipped even if onMutate already ran
- **External abort and timeout compose**: Both listen to same internal AbortController
- **Cache entries survive resource disposal**: Global cache outlives individual resource instances
- **updateCacheData returns false on miss**: Indicates update failed, useful for conditional logic
- **LRU sorts entire cache**: No heap/tree optimization, acceptable for configured limits
- **Promise.race abort pattern**: Reject promise wraps abort listener to propagate cancellation
- **isLoading vs isFetching**: isLoading=true only when no data, isFetching=true for any network
- **staleTime default is Infinity for resources, 0 for resourceCache.set**: Resources pass `staleTime ?? Infinity` to cache; direct `resourceCache.set()` defaults staleTime to 0
- **revalidateOnStale default is true**: Background fetch triggers when stale
- **transform creates computed signal**: Transform applied on every data() access
- **Polling requires refetchOnKeyChange:true**: Without refetchOnKeyChange, polling doesn't start
- **Retry delay is checked for abort**: Long delays can be interrupted by abort
- **invalidateByPrefix only matches strings**: Non-string keys ignored by pattern matching
- **refetchOnKeyChange skips nullish keys**: When an explicit key is provided and resolves to null/undefined, the effect-driven fetch is skipped; resources without an explicit key always fetch
