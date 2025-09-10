<technical-internals>
  <core-architecture>
    <reactive-state-system>
      <signal-integration>
        The resource system is built entirely on @hellajs/core signal primitives, providing reactive data, error, and loading states. Each resource maintains internal signals (data, error, loading) that are exposed as readonly computed values, ensuring reactive updates propagate automatically through the dependency graph. The status signal is computed from the combination of loading, error, and data states, following a predictable state machine pattern with optimized dependency tracking.
      </signal-integration>
      <state-management-lifecycle>
        State transitions follow strict patterns: idle → loading → success/error → idle. The data signal holds fetched results or initialData, the error signal contains ResourceError objects with categorized error types (abort, not_found, server, client, unknown), and the loading signal tracks request state. All state updates are atomic and coordinated to prevent intermediate states that could cause UI glitches. Special abort handling ensures AbortError from DOMException clears loading state without setting error state.
      </state-management-lifecycle>
    </reactive-state-system>
    <cache-architecture>
      <global-cache-design>
        A single global Map (cacheMap) stores all cached entries across resource instances, enabling efficient memory usage and cache sharing. Each entry contains data, timestamp, cacheTime, and lastAccess for LRU management. The cache operates independently of individual resource instances, allowing data sharing between resources with identical keys. The resourceCache API provides comprehensive cache control with methods for set, get, update, cleanup, invalidation, and batch operations.
      </global-cache-design>
      <lru-eviction-system>
        When cache size exceeds globalCacheConfig.maxSize (default 1000), the system performs LRU eviction by sorting entries by lastAccess timestamp and removing the oldest entries. Cache cleanup runs periodically via cleanupExpiredCache() every 60 seconds, processing batches of up to 100 expired entries to prevent performance spikes. The eviction algorithm calculates entriesToEvict = currentSize - maxSize and removes entries atomically.
      </lru-eviction-system>
    </cache-architecture>
    <request-lifecycle-engine>
      <fetch-execution-phases>
        Request execution follows a multi-phase pipeline: cache check → deduplication → request initiation → promise race → cache storage → state update. The run() function implements force parameter for cache bypassing. Cache check phase uses getCacheData() with expiration validation. Deduplication phase checks ongoingRequestsMap for shared promises. Request initiation creates AbortController with timeout and external abort signal handling. Promise race between fetcher and abort rejection ensures prompt cancellation.
      </fetch-execution-phases>
      <abort-mechanism>
        AbortController-based cancellation system with comprehensive cleanup. currentAbortController reference is maintained with proper cleanup via cleanAbort() helper. Timeout handlers are cleared via clearTimeout to prevent memory leaks. External abortSignal is chained with addEventListener('abort'). Abort events trigger immediate cleanup and state reset to initialData, preventing stale responses from updating signals. Special handling for AbortError from DOMException clears loading state without setting error state.
      </abort-mechanism>
    </request-lifecycle-engine>
  </core-architecture>
  <caching-system>
    <cache-key-management>
      <key-generation-strategy>
        Cache keys are generated using the key() function executed in untracked() context to prevent reactive dependencies on cache operations. For string URL resources, the key defaults to the URL string via automatically created key function. Custom fetcher resources require explicit key functions for proper caching and deduplication behavior. The untracked() execution isolates cache operations from reactive dependency tracking while allowing the key function itself to be reactive.
      </key-generation-strategy>
      <cache-invalidation-patterns>
        Cache entries are invalidated through multiple mechanisms: TTL expiration based on cacheTime (Date.now() - entry.timestamp >= cacheTime), manual invalidation via invalidate() which deletes from cacheMap and triggers fresh request, and LRU eviction when cache size limits are exceeded. The invalidate() method bypasses all cache checks and calls run(true) for forced refresh. resourceCache provides invalidateMultiple() for batch operations.
      </cache-invalidation-patterns>
    </cache-key-management>
    <ttl-based-expiration>
      <expiration-algorithm>
        Cache expiration uses timestamp comparison: Date.now() - entry.timestamp >= entry.cacheTime. Expired entries are cleaned up during cache access (getCacheData) and periodic cleanup cycles (cleanupExpiredCache). The cleanup process uses batch processing with CACHE_CLEANUP_BATCH_SIZE (100 entries) to handle large cache sizes efficiently, preventing UI blocking during cleanup operations. Cleanup also updates lastAccess timestamps for LRU tracking.
      </expiration-algorithm>
      <cleanup-scheduling>
        Periodic cleanup runs every CACHE_CLEANUP_INTERVAL (60000ms) via lastCleanupTime tracking. Cleanup processes up to 100 entries per cycle with throttling to prevent excessive processing (if now - lastCleanupTime < 60000, return early). Cleanup also runs on-demand during cache access to handle hot paths efficiently. The cleanupExpiredCache function uses Array collection and forEach deletion to avoid concurrent modification issues.
      </cleanup-scheduling>
    </ttl-based-expiration>
    <lru-implementation>
      <access-tracking>
        Each cache entry tracks lastAccess timestamp, updated on both cache hits and new entries. LRU eviction sorts entries by lastAccess to identify least recently used items. This enables efficient cache size management while preserving frequently accessed data.
      </access-tracking>
      <eviction-strategy>
        When maxSize is exceeded, the system calculates entriesToEvict = currentSize - maxSize and removes the oldest entries. Eviction is atomic and immediate, preventing cache size from growing beyond limits. The LRU algorithm prioritizes data freshness over cache age.
      </eviction-strategy>
    </lru-implementation>
  </caching-system>
  <request-deduplication>
    <concurrent-request-handling>
      <deduplication-mechanism>
        Identical concurrent requests (same cache key) share a single Promise via ongoingRequestsMap. The first request creates a shared promise with AbortController and subscribers Set, subsequent requests with the same key subscribe to the existing promise rather than initiating new network requests. The map entry structure: { promise: fetcherPromise, abortController: currentAbortController, subscribers: Set<callback> }. Force requests (run(true)) bypass deduplication entirely.
      </deduplication-mechanism>
      <subscriber-notification>
        The deduplication system maintains a subscribers Set for each ongoing request. When the shared promise resolves or rejects, handleSubscribers() notifies all subscribers simultaneously via forEach(callback => callback(result, error)). This ensures consistent state across all resource instances waiting for the same data. The ongoingRequestsMap entry is deleted after notification to prevent memory leaks.
      </subscriber-notification>
    </concurrent-request-handling>
    <abort-coordination>
      <shared-abort-handling>
        When multiple resources share a deduplicated request, abort handling switches to the ongoing request's AbortController via currentAbortController = cleanAbort(abortController). This prevents one resource's abort from affecting other resources waiting for the same data. Individual resources can still abort their own participation by calling cleanAbort() which creates a new controller and aborts the previous one.
      </shared-abort-handling>
      <cleanup-synchronization>
        Shared requests clean up from ongoingRequestsMap when the promise settles, regardless of success or failure. The cleanup happens in handleSubscribers() after notifying all subscribers. This prevents memory leaks and ensures the deduplication system doesn't accumulate stale request tracking data over time. AbortController cleanup via cleanAbort() also handles timeout handler clearing.
      </cleanup-synchronization>
    </abort-coordination>
  </request-deduplication>
  <error-handling-system>
    <error-categorization>
      <structured-error-types>
        The categorizeError function transforms raw errors into structured ResourceError objects with message, category, statusCode, and originalError fields. Categories include 'abort' (DOMException with name 'AbortError'), 'not_found' (HTTP 404), 'server' (HTTP 5xx), 'client' (HTTP 4xx), and 'unknown' (all other errors). Status code extraction uses regex pattern /^HTTP (\d+):/ from error messages. The originalError field preserves full error context for debugging.
      </structured-error-types>
      <status-code-extraction>
        HTTP status codes are extracted from error messages using regex pattern matching (/^HTTP (\d+):/). Status codes determine error categories: statusCode === 404 → 'not_found', statusCode >= 500 → 'server', statusCode >= 400 → 'client'. The categorizeError function handles both Error instances and DOMException specially, with AbortError receiving 'abort' category regardless of status code presence.
      </status-code-extraction>
    </error-categorization>
    <error-propagation>
      <callback-integration>
        Error callbacks (onError) are invoked after error signal updates in handleError(), maintaining consistent state-first, callback-second ordering. Success callbacks (onSuccess) are invoked in handleSuccess(). Callbacks receive the original error object, not the categorized ResourceError, preserving full error context for application-specific handling. The mutation system includes onMutate, onSuccess, onError, and onSettled hooks with proper context passing.
      </callback-integration>
      <abort-error-handling>
        AbortError from DOMException receives special handling in handleSuccessError() to prevent loading state persistence. The condition (err instanceof DOMException && err.name === 'AbortError') calls loading(false) directly without setting error state, distinguishing between user-initiated cancellation and actual failures. This ensures clean state transitions when requests are intentionally cancelled.
      </abort-error-handling>
    </error-propagation>
  </error-handling-system>
  <performance-optimization>
    <lazy-evaluation-strategies>
      <cache-access-patterns>
        Cache access uses lazy cleanup - expired entries are only removed when accessed (getCacheData) or during periodic cleanup cycles (cleanupExpiredCache). This avoids unnecessary iteration over the entire cache on every request. Cache hits update lastAccess timestamps (entry.lastAccess = Date.now()) for LRU tracking without triggering full cache maintenance. The setCacheData function performs cleanup before adding new entries to prevent unbounded growth.
      </cache-access-patterns>
      <signal-computation-efficiency>
        Status computation uses conditional logic to minimize reactive dependencies: loading() is checked first (most dynamic), followed by error(), then data() comparison with initialData. The status() function optimizes common cases where loading state changes most frequently. Computed signals (data, error, loading, status) wrap internal signals to provide readonly access while maintaining reactivity.
      </signal-computation-efficiency>
    </lazy-evaluation-strategies>
    <memory-management>
      <controller-cleanup>
        AbortController instances are properly cleaned up on request completion or abort via cleanAbort() helper function. Timeout handlers are cleared via clearTimeout to prevent memory leaks from long-lived timeout references (const timeoutId = setTimeout(); signal.addEventListener('abort', () => clearTimeout(timeoutId))). Event listeners are automatically cleaned up when controllers are aborted. The currentAbortController reference is nullified after cleanup.
      </controller-cleanup>
      <cache-size-management>
        Cache size management implements LRU eviction when cacheMap.size > maxSize (default 1000). The system calculates entriesToEvict = cacheMap.size - maxSize, sorts entries by lastAccess timestamp, and deletes the oldest entries. This prevents unbounded memory growth while preserving frequently accessed data. The resourceCache API provides comprehensive cache control including updateMultiple() and invalidateMultiple() for batch operations.
      </cache-size-management>
    </memory-management>
  </performance-optimization>
  <reactive-integration-patterns>
    <signal-composition>
      <computed-state-derivation>
        The status computed signal derives state from data, error, and loading signals using a predictable state machine: loading → "loading", error → "error", data === initialData → "idle", data !== undefined → "success", fallback → "idle". This ensures consistent status reporting across all resource states.
      </computed-state-derivation>
      <dependency-tracking>
        Resource functions execute key() in untracked() context to prevent cache operations from creating reactive dependencies. This isolates cache behavior from reactive updates while allowing the key function itself to be reactive for cache invalidation when dependencies change.
      </dependency-tracking>
    </signal-composition>
    <effect-system-integration>
      <manual-control-pattern>
        Resources initialize with an effect that enables optional auto-fetching behavior. By default (auto: false), the effect is inactive, maintaining manual control where developers explicitly call get() or request(). This preserves the manual control principle while enabling reactive patterns when needed.
      </manual-control-pattern>
      <auto-fetch-mechanism>
        When auto: true is enabled, the effect tracks key() function dependencies and automatically calls run(false) when they change. The auto-fetch respects the enabled flag - if enabled is false, no automatic fetching occurs regardless of key changes. This provides seamless reactive data synchronization while maintaining backward compatibility and explicit control options.
      </auto-fetch-mechanism>
      <reactive-key-updates>
        The key() function can contain reactive dependencies (signals, computed values) that trigger automatic refetching when auto: true. The effect system automatically discovers these dependencies without requiring explicit declaration, enabling dynamic resource behavior based on changing application state.
      </reactive-key-updates>
    </effect-system-integration>
  </reactive-integration-patterns>
  <api-design-patterns>
    <overloaded-interfaces>
      <string-url-optimization>
        The string URL overload provides a convenient API for common fetch scenarios by automatically creating a fetcher function with JSON response parsing and HTTP error handling. The URL string becomes both the cache key and the request target, simplifying typical REST API usage.
      </string-url-optimization>
      <custom-fetcher-flexibility>
        The custom fetcher overload supports arbitrary data sources and transformation logic. Fetchers receive typed key parameters and return Promise<T>, enabling integration with GraphQL, WebSocket, file system, or any async data source while maintaining full type safety.
      </custom-fetcher-flexibility>
    </overloaded-interfaces>
    <method-semantics>
      <fetch-vs-request-distinction>
        fetch() and get() implement cache-first behavior, returning cached data when valid and only making network requests when necessary. request() bypasses cache entirely and forces fresh data retrieval by calling run(true). The invalidate() method clears cache and triggers fresh request. The mutate() method provides optimistic updates with onMutate, onSuccess, onError, and onSettled hooks for comprehensive mutation lifecycle management.
      </fetch-vs-request-distinction>
      <state-mutation-prevention>
        All exposed signals (data, error, loading, status) are readonly computed values, preventing external code from directly mutating resource state. State changes occur only through internal signal updates triggered by fetch operations or mutations. The setData() method allows controlled cache updates via setCacheData() and updateCacheData() functions.
      </state-mutation-prevention>
    </method-semantics>
  </api-design-patterns>
  <type-safety-system>
    <generic-type-flow>
      <return-type-inference>
        TypeScript generics flow from fetcher return types through Promise<T> to Resource<T>, ensuring end-to-end type safety. The data signal maintains T | undefined typing to represent idle/loading states, while success callbacks receive strongly typed T parameters.
      </return-type-inference>
      <key-type-consistency>
        Cache key types flow from ResourceOptions<T, K> through key() function returns to fetcher(key: K) parameters. This ensures cache keys match fetcher expectations and prevents runtime type mismatches in user code.
      </key-type-consistency>
    </generic-type-flow>
    <option-validation>
      <configuration-type-safety>
        ResourceOptions uses generic constraints to ensure type consistency between fetcher signatures and option configurations. Optional properties maintain strict typing while providing sensible defaults for common use cases.
      </configuration-type-safety>
      <callback-parameter-typing>
        Success and error callbacks receive properly typed parameters: onSuccess(data: T) and onError(err: unknown). This provides type safety for user callbacks while maintaining flexibility for error handling patterns.
      </callback-parameter-typing>
    </option-validation>
  </type-safety-system>
  <advanced-internals>
    <promise-race-implementation>
      <abort-signal-racing>
        Request execution uses Promise.race between fetcher execution and abort signal rejection. The abort signal creates a rejection promise that immediately rejects when aborted: `new Promise<never>((_, reject) => { const onAbort = () => reject(new DOMException('Request was aborted', 'AbortError')); signal.aborted ? onAbort() : signal.addEventListener('abort', onAbort); })`. This ensures prompt cancellation even for long-running fetchers that don't natively support cancellation.
      </abort-signal-racing>
      <timeout-coordination>
        Timeout handling integrates with AbortController by setting a timeout that calls abort() when exceeded. The timeout is cleared on abort to prevent memory leaks from pending timeouts: `const timeoutId = setTimeout(() => currentAbortController!.abort(), timeout); signal.addEventListener('abort', () => clearTimeout(timeoutId))`. This provides consistent cancellation behavior across all async operations.
      </timeout-coordination>
    </promise-race-implementation>
    <state-consistency-guarantees>
      <atomic-updates>
        State updates are atomic within each request phase - all related signals (data, error, loading) are updated together to prevent intermediate states. The handleSuccess() and handleError() functions coordinate signal updates. The !currentSignal.aborted check ensures updates only occur for non-cancelled requests, maintaining state consistency even during concurrent operations and deduplication scenarios.
      </atomic-updates>
      <exception-safety>
        Try-catch blocks surround all async operations with proper cleanup in finally blocks. State consistency is maintained even when user fetchers throw exceptions via handleSuccessError(err) calls, and reactive context is always restored through untracked() execution to prevent dependency graph corruption. The mutation system includes comprehensive error handling with context preservation.
      </exception-safety>
    </state-consistency-guarantees>
    <cache-coherence-protocols>
      <entry-lifecycle-management>
        Cache entries progress through states: creation with timestamp and lastAccess in setCacheData() → periodic access updates in getCacheData() → expiration checking via Date.now() - entry.timestamp >= entry.cacheTime → cleanup in cleanupExpiredCache() → deletion via cacheMap.delete(). Each state transition maintains cache coherence and prevents stale data from persisting beyond TTL limits. The resourceCache API provides complete lifecycle control.
      </entry-lifecycle-management>
      <concurrent-access-handling>
        Cache operations are synchronous and atomic, preventing race conditions between cache reads, writes, and cleanup operations. Multiple resources can safely access shared cache entries without coordination, as Map operations provide necessary atomicity guarantees. The global cacheMap ensures data sharing between resource instances with identical keys while maintaining thread safety in single-threaded JavaScript execution.
      </concurrent-access-handling>
    </cache-coherence-protocols>
  </advanced-internals>
</technical-internals>