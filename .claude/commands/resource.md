<resource-package-context>
  <key-instructions>
  <p>Your role is to gain a comprehensive understanding of the resource package's structure and functionality.</p>
  <p>IMMEDIATELY LOAD ALL THESE FOLDERS & FILES INTO CONTEXT:</p>
  <ul>
    <li>@packages/resource/ - Source code</li>
    <li>@docs/src/pages/learn/concepts/resources.mdx - Concepts and examples</li>
    <li>@docs/src/pages/reference/resource/ - API documentation</li>
    <li>@tests/resource/ - Test suites for validation</li>
  </ul>
  </key-instructions>
  <architectural-principles>
    <reactive-state-management>Seamlessly integrates with HellaJS reactive signals for data, error, loading, and status state management</reactive-state-management>
    <manual-control>No auto-fetching behavior - developers control when requests execute via explicit fetch() or request() calls</manual-control>
    <intelligent-caching>Global cache with TTL-based expiration, LRU eviction, and key-based invalidation for optimal performance</intelligent-caching>
    <request-deduplication>Concurrent requests with identical cache keys share a single Promise to prevent duplicate network calls</request-deduplication>
    <abort-safety>AbortController-based cancellation system prevents stale responses from updating signals after cancellation</abort-safety>
  </architectural-principles>
  <critical-algorithms>
    <run>Multi-phase request pipeline: cache check → deduplication → request initiation → promise race → cache storage → state update</run>
    <categorizeError>Transforms raw errors into structured ResourceError objects with categorized types based on HTTP status codes</categorizeError>
    <cleanupExpiredCache>Periodic batch cleanup of expired cache entries with LRU eviction when cache size exceeds limits</cleanupExpiredCache>
    <handleSuccessError>Special abort error handling that distinguishes user-initiated cancellation from actual failures</handleSuccessError>
    <deduplication-system>Shared promise management via ongoingRequestsMap with subscriber notification for concurrent requests</deduplication-system>
  </critical-algorithms>
  <instructions>
  <p>When working on the resource package, you have deep knowledge of the data fetching system's internals. Always consider:</p>
  <ol>
    <li><strong>Manual Control</strong> - Never introduce auto-fetching behavior; maintain explicit developer control over request timing</li>
    <li><strong>Cache Consistency</strong> - Cache operations must maintain data coherence and prevent stale data persistence beyond TTL</li>
    <li><strong>State Atomicity</strong> - All signal updates must be atomic and coordinated to prevent intermediate UI states</li>
    <li><strong>Abort Handling</strong> - AbortController cleanup must prevent memory leaks from timeout handlers and event listeners</li>
    <li><strong>Type Safety</strong> - Generic type flow from fetcher return types to Resource<T> ensures end-to-end type safety</li>
    <li><strong>Error Categories</strong> - Structured error handling with proper HTTP status code extraction and categorization</li>
    <li><strong>Memory Management</strong> - LRU eviction and periodic cleanup prevent unbounded cache growth</li>
  </ol>
</instructions>
</resource-package-context>