<technical-internals>
  <core-architecture>
    <reactive-state-system>
      <signal-integration>
        The resource system is built entirely on @hellajs/core signal primitives, providing reactive data, error, and loading states. Each resource maintains internal signals that are exposed as readonly computed values, ensuring reactive updates propagate automatically through the dependency graph. The status signal is computed from the combination of loading, error, and data states, following a predictable state machine pattern.
      </signal-integration>
      <state-management-lifecycle>
        State transitions follow strict patterns: idle → loading → success/error → idle. The data signal holds fetched results or initialData, the error signal contains ResourceError objects with categorized error types, and the loading signal tracks request state. All state updates are atomic and coordinated to prevent intermediate states that could cause UI glitches.
      </state-management-lifecycle>
    </reactive-state-system>
    <cache-architecture>
      <global-cache-design>
        A single global Map (cacheMap) stores all cached entries across resource instances, enabling efficient memory usage and cache sharing. Each entry contains data, timestamp, cacheTime, and lastAccess for LRU management. The cache operates independently of individual resource instances, allowing data sharing between resources with identical keys.
      </global-cache-design>
      <lru-eviction-system>
        When cache size exceeds globalCacheConfig.maxSize, the system performs LRU eviction by sorting entries by lastAccess timestamp and removing the oldest entries. Cache cleanup runs periodically via cleanupExpiredCache(), processing batches of expired entries to prevent performance spikes during cleanup operations.
      </lru-eviction-system>
    </cache-architecture>
    <request-lifecycle-engine>
      <fetch-execution-phases>
        Request execution follows a multi-phase pipeline: cache check → deduplication → request initiation → promise race → cache storage → state update. Each phase includes error handling and abort checking to ensure consistent state even when requests are cancelled or fail during execution.
      </fetch-execution-phases>
      <abort-mechanism>
        AbortController-based cancellation system with cleanup of timeout handlers and event listeners. The system maintains currentAbortController reference and properly chains external abortSignal when provided. Abort events trigger immediate cleanup and state reset to initialData, preventing stale responses from updating signals.
      </abort-mechanism>
    </request-lifecycle-engine>
  </core-architecture>
  <caching-system>
    <cache-key-management>
      <key-generation-strategy>
        Cache keys are generated using the key() function executed in untracked() context to prevent reactive dependencies on cache operations. For string URL resources, the key defaults to the URL string. Custom fetcher resources require explicit key functions for proper caching and deduplication behavior.
      </key-generation-strategy>
      <cache-invalidation-patterns>
        Cache entries are invalidated through multiple mechanisms: TTL expiration based on cacheTime, manual invalidation via invalidate(), and LRU eviction when cache size limits are exceeded. Invalidation triggers immediate cache deletion and fresh request execution, bypassing all cache checks.
      </cache-invalidation-patterns>
    </cache-key-management>
    <ttl-based-expiration>
      <expiration-algorithm>
        Cache expiration uses timestamp comparison: Date.now() - entry.timestamp < cacheTime. Expired entries are cleaned up during cache access and periodic cleanup cycles. The cleanup process uses batch processing to handle large cache sizes efficiently, preventing UI blocking during cleanup operations.
      </expiration-algorithm>
      <cleanup-scheduling>
        Periodic cleanup runs every CACHE_CLEANUP_INTERVAL (60 seconds) via lastCleanupTime tracking. Cleanup processes up to CACHE_CLEANUP_BATCH_SIZE entries per cycle, ensuring consistent performance. Cleanup also runs on-demand during cache access to handle hot paths efficiently.
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
        Identical concurrent requests (same cache key) share a single Promise via ongoingRequestsMap. The first request creates a shared promise with AbortController, and subsequent requests with the same key subscribe to the existing promise rather than initiating new network requests.
      </deduplication-mechanism>
      <subscriber-notification>
        The deduplication system maintains a subscribers Set for each ongoing request. When the shared promise resolves or rejects, all subscribers receive the result simultaneously. This ensures consistent state across all resource instances waiting for the same data.
      </subscriber-notification>
    </concurrent-request-handling>
    <abort-coordination>
      <shared-abort-handling>
        When multiple resources share a deduplicated request, abort handling switches to the ongoing request's AbortController. This prevents one resource's abort from affecting other resources waiting for the same data. Individual resources can still abort their own participation in the shared request.
      </shared-abort-handling>
      <cleanup-synchronization>
        Shared requests clean up from ongoingRequestsMap when the promise settles, regardless of success or failure. This prevents memory leaks and ensures the deduplication system doesn't accumulate stale request tracking data over time.
      </cleanup-synchronization>
    </abort-coordination>
  </request-deduplication>
  <error-handling-system>
    <error-categorization>
      <structured-error-types>
        The categorizeError function transforms raw errors into structured ResourceError objects with message, category, statusCode, and originalError fields. Categories include 'abort', 'not_found', 'server', 'client', and 'unknown' based on error type analysis and HTTP status code extraction.
      </structured-error-types>
      <status-code-extraction>
        HTTP status codes are extracted from error messages using regex pattern matching (/^HTTP (\d+):/). Status codes determine error categories: 404 → 'not_found', 5xx → 'server', 4xx → 'client'. This enables structured error handling in application code.
      </status-code-extraction>
    </error-categorization>
    <error-propagation>
      <callback-integration>
        Error callbacks (onError) are invoked after error signal updates, maintaining consistent state-first, callback-second ordering. Callbacks receive the original error object, not the categorized ResourceError, preserving full error context for application-specific handling.
      </callback-integration>
      <abort-error-handling>
        AbortError from DOMException receives special handling to prevent loading state persistence. Abort errors clear loading state without setting error state when the request is intentionally cancelled, distinguishing between user-initiated cancellation and actual failures.
      </abort-error-handling>
    </error-propagation>
  </error-handling-system>
  <performance-optimization>
    <lazy-evaluation-strategies>
      <cache-access-patterns>
        Cache access uses lazy cleanup - expired entries are only removed when accessed or during periodic cleanup cycles. This avoids unnecessary iteration over the entire cache on every request. Cache hits update lastAccess timestamps for LRU tracking without triggering full cache maintenance.
      </cache-access-patterns>
      <signal-computation-efficiency>
        Status computation uses conditional logic to minimize reactive dependencies: loading() is checked first (most dynamic), followed by error(), then data() comparison. This ordering optimizes common cases where loading state changes most frequently.
      </signal-computation-efficiency>
    </lazy-evaluation-strategies>
    <memory-management>
      <controller-cleanup>
        AbortController instances are properly cleaned up on request completion or abort. Timeout handlers are cleared via clearTimeout to prevent memory leaks from long-lived timeout references. Event listeners are automatically cleaned up when controllers are aborted.
      </controller-cleanup>
      <cache-size-management>
        Global cache size is monitored and controlled through maxSize configuration. LRU eviction prevents unbounded memory growth while preserving frequently accessed data. Batch cleanup operations process multiple expired entries efficiently without blocking the main thread.
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
        Resources initialize with a no-op effect to maintain consistency with reactive patterns while preventing auto-fetching. This gives developers explicit control over when requests execute via fetch() or request() calls, supporting both reactive and imperative usage patterns.
      </manual-control-pattern>
      <reactive-key-updates>
        When key() function dependencies change, resources can be configured to automatically refetch data by calling fetch() in reactive contexts. This enables dynamic resource behavior while maintaining the manual control principle for initial requests.
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
        fetch() implements cache-first behavior, returning cached data when valid and only making network requests when necessary. request() bypasses cache entirely and forces fresh data retrieval. This distinction enables both performance-optimized and data-freshness-focused usage patterns.
      </fetch-vs-request-distinction>
      <state-mutation-prevention>
        All exposed signals are readonly computed values, preventing external code from directly mutating resource state. State changes occur only through internal signal updates triggered by fetch operations, ensuring data consistency and preventing state corruption.
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
        Request execution uses Promise.race between fetcher execution and abort signal rejection. The abort signal creates a rejection promise that immediately rejects when aborted, ensuring prompt cancellation even for long-running fetchers that don't natively support cancellation.
      </abort-signal-racing>
      <timeout-coordination>
        Timeout handling integrates with AbortController by setting a timeout that calls abort() when exceeded. The timeout is cleared on abort to prevent memory leaks from pending timeouts. This provides consistent cancellation behavior across all async operations.
      </timeout-coordination>
    </promise-race-implementation>
    <state-consistency-guarantees>
      <atomic-updates>
        State updates are atomic within each request phase - all related signals (data, error, loading) are updated together to prevent intermediate states. The abort flag check ensures updates only occur for non-cancelled requests, maintaining state consistency even during concurrent operations.
      </atomic-updates>
      <exception-safety>
        Try-catch blocks surround all async operations with proper cleanup in finally blocks. State consistency is maintained even when user fetchers throw exceptions, and reactive context is always restored to prevent dependency graph corruption.
      </exception-safety>
    </state-consistency-guarantees>
    <cache-coherence-protocols>
      <entry-lifecycle-management>
        Cache entries progress through states: creation with timestamp and lastAccess → periodic access updates → expiration → cleanup → deletion. Each state transition maintains cache coherence and prevents stale data from persisting beyond TTL limits.
      </entry-lifecycle-management>
      <concurrent-access-handling>
        Cache operations are synchronous and atomic, preventing race conditions between cache reads, writes, and cleanup operations. Multiple resources can safely access shared cache entries without coordination, as Map operations provide necessary atomicity guarantees.
      </concurrent-access-handling>
    </cache-coherence-protocols>
  </advanced-internals>
</technical-internals>