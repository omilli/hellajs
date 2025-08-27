# @hellajs/resource Instructions

Follow these instructions when working on the Resource package. @hellajs/resource provides reactive data fetching with intelligent caching, automatic state management, and seamless signal integration.

## Quick Reference

### Key Files
- `lib/resource.ts` - Main resource function with caching and lifecycle management
- `lib/types.ts` - TypeScript definitions for resource interfaces and options
- `lib/index.ts` - Public API exports

## Architecture

### Core Design Principles
1. **Manual Control**: No auto-fetching, explicit `.fetch()` or `.request()` calls required
2. **Signal Integration**: Built on @hellajs/core signals for reactive state management
3. **Intelligent Caching**: Global cache with TTL-based expiration and key-based invalidation
4. **Race Condition Safety**: Abort mechanism prevents stale responses from updating state
5. **Developer Experience**: Overloaded API with string URL shorthand for common cases

### Resource Function (`resource`)
```typescript
function resource<T>(url: string, options?: ResourceOptions<T, string>): Resource<T>
function resource<T, K>(fetcher: (key: K) => Promise<T>, options?: ResourceOptions<T, K>): Resource<T>
```

**Features**:
- Two overloads: simple string URLs and custom fetcher functions
- Manual fetch control with `.fetch()` (cache-first) and `.request()` (force refresh)
- Global caching system with configurable TTL via `cacheTime` option
- Abort mechanism using boolean flag to prevent race conditions
- Reactive state management with four core signals: `data`, `error`, `loading`, `status`

**Options**:
- `key?: () => K` - Cache key function (defaults to URL for string overload)
- `enabled?: boolean` - Enable/disable resource (default: true)
- `initialData?: T` - Initial data value
- `cacheTime?: number` - Cache TTL in milliseconds (default: 0 = no caching)
- `onSuccess?: (data: T) => void` - Success callback
- `onError?: (err: unknown) => void` - Error callback

### Resource Object
```typescript
type Resource<T> = {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<unknown>;
  loading: ReadonlySignal<boolean>;
  status: ReadonlySignal<ResourceStatus>;
  fetch(): void;
  request(): void;
  abort(): void;
  invalidate(): void;
}
```

**State Signals**:
- `data` - Current data value (undefined when idle/loading)
- `error` - Error state (undefined when successful/idle)
- `loading` - Loading indicator
- `status` - Computed status: "idle" | "loading" | "success" | "error"

**Control Methods**:
- `fetch()` - Cache-first fetch (returns cached data if valid)
- `request()` - Force fetch (bypasses cache)
- `abort()` - Cancel ongoing request and reset to initial state
- `invalidate()` - Clear cache entry and trigger fresh request

### Cache Management System
Located in `resource.ts`:
- `cacheMap` - Global Map storing cached responses
- `cleanupExpiredCache()` - Periodic cleanup of expired entries
- `CACHE_CLEANUP_INTERVAL` - Cleanup frequency (60 seconds)
- `CACHE_CLEANUP_BATCH_SIZE` - Batch size for cleanup operations

### Signal-Based State Management
```typescript
// Internal signals (private)
const data = signal<T | undefined>(options.initialData);
const error = signal<unknown>(undefined);
const loading = signal(false);

// Exposed as readonly computed values
return {
  data: computed(() => data()),
  error: computed(() => error()),
  loading: computed(() => loading()),
  status: computed(() => {
    if (loading()) return "loading";
    if (error()) return "error";
    if (data() === options.initialData) return "idle";
    if (data() !== undefined) return "success";
    return "idle";
  })
};
```

### Reactive Integration
Seamless integration with `@hellajs/core` signals:
```typescript
import { signal, effect } from '@hellajs/core';
import { resource } from '@hellajs/resource';

const userId = signal(1);
const userResource = resource(
  (id: number) => fetch(`/api/users/${id}`).then(r => r.json()),
  { 
    key: () => userId(),
    cacheTime: 300000 // 5 minutes
  }
);

effect(() => {
  userResource.fetch(); // Refetches when userId changes
});
```

## Implementation Details

### Manual Fetch Control Pattern
```typescript
// resource.ts:104-113
// Remove initial auto-fetch effect
if (cleanupEffect) cleanupEffect();
cleanupEffect = effect(() => {
  // No-op: do not auto-fetch on creation
});
```

**Design Decision**:
- Resources do not auto-fetch on creation
- Prevents unwanted network requests
- Gives developers full control over when data loads
- Effect system present but used as no-op for consistency

### Global Cache with TTL
```typescript
// resource.ts:23-42
function getCache(key: K): T | undefined {
  if (!cacheTime) return undefined;
  
  cleanupExpiredCache();
  
  const entry = cacheMap.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < cacheTime) {
    return entry.data;
  }
  
  if (entry) {
    cacheMap.delete(key);
  }
  
  return undefined;
}
```

**Cache Features**:
- Single global Map for all resource instances
- TTL-based expiration with automatic cleanup
- Key function executed in `untracked()` context
- Immediate cleanup of expired entries when accessed

### Abort Mechanism
```typescript
// resource.ts:65-85
let aborted = false;

async function run(force = false) {
  // ... fetch logic ...
  try {
    const result = await fetcher(key);
    setCache(key, result);
    if (!aborted) {  // Check abort flag before state update
      data(result);
      loading(false);
      options.onSuccess?.(result);
    }
  } catch (err) {
    if (!aborted) {  // Check abort flag before error update
      error(err);
      loading(false);
      options.onError?.(err);
    }
  }
}
```

**Race Condition Prevention**:
- Simple boolean flag to track abort state
- Checked before every state update
- Prevents stale responses from updating signals
- Coordinated with loading state management

### Overloaded API Design
```typescript
// String URL overload
export function resource<T = unknown>(
  url: string,
  options?: ResourceOptions<T, string>
): Resource<T>;

// Custom fetcher overload
export function resource<T, K = undefined>(
  fetcher: (key: K) => Promise<T>,
  options?: ResourceOptions<T, K>
): Resource<T>;
```

**Implementation Strategy**:
- String URL converted to fetcher function internally
- Automatic key function defaulting for URL strings
- Shared options type between overloads
- TypeScript generics infer return types from promises

## Development Guidelines

### Adding New Features
1. **Understand Signal Flow**: Review reactive state management patterns
2. **Maintain Manual Control**: Ensure no auto-fetch behavior is introduced
3. **Preserve Cache Consistency**: Update cache before signals
4. **Handle Race Conditions**: Check abort flag before state updates
5. **Update Types**: Modify `types.ts` for TypeScript support
6. **Add Tests**: Include caching, lifecycle, and reactive integration tests

### Performance Considerations
- Cache resources outside render functions to prevent recreating
- Use appropriate `cacheTime` values to balance freshness vs performance
- Leverage key functions for efficient cache invalidation
- Monitor global cache size and cleanup frequency
- Batch cache cleanup operations for better performance

### Common Patterns
```typescript
// ✅ Simple URL resource with caching
const userResource = resource('/api/user', {
  cacheTime: 300000, // 5 minutes
  onError: (err) => console.error('Failed to load user:', err)
});

// ✅ Dynamic resource with reactive key
const postResource = resource(
  (id: number) => fetch(`/api/posts/${id}`).then(r => r.json()),
  {
    key: () => currentPostId(),
    cacheTime: 60000, // 1 minute
    enabled: canLoadPosts()
  }
);

// ✅ Manual control usage
effect(() => {
  if (shouldLoadData()) {
    dataResource.fetch(); // Cache-first
  }
});

// Force refresh when needed
dataResource.request();

// Cleanup when component unmounts
dataResource.abort();
```

### API Consistency Rules
- All methods return void (no chaining)
- Signals are readonly to prevent external mutation
- Cache operations are synchronous where possible
- Error handling preserves original error objects
- Status derivation follows predictable state machine
- Abort mechanism resets to initial state

## Integration

### With @hellajs/core
- Built entirely on signal primitives from core
- Effects manage reactive fetch lifecycles
- Computed values for derived state (status)
- Untracked execution for cache key functions
- Seamless reactive updates when dependencies change

### Cache Strategy
- Global cache shared across all resource instances
- TTL-based expiration with configurable timeouts
- Automatic cleanup prevents memory leaks
- Key-based invalidation for targeted updates
- Immediate cleanup of expired entries on access

### Error Handling
- Preserves original error objects without modification
- Separate error signal independent of data/loading states
- Error callbacks fired after signal updates
- Abort mechanism clears error state on reset
- No automatic error recovery (manual control principle)