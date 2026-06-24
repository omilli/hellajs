---
applyTo: "packages/resource/**"
---

<resource-package-instructions>
  <overview>
    Reactive async data fetching with intelligent caching, request deduplication, and abort control. Cache-first reactive data fetching without manual cache invalidation.
  </overview>
  <mental-model>
    <concept>Resource is a reactive container with loading/error/data states</concept>
    <concept>Cache is fetcher-scoped with TTL-based entries and global LRU eviction</concept>
    <concept>Deduplication shares promises for concurrent identical requests</concept>
    <concept>Abort provides fine-grained cancellation with external signal support</concept>
    <concept>Mutations are promise-based writes with optimistic update hooks</concept>
    <concept>SWR (stale-while-revalidate) pattern for background refresh</concept>
  </mental-model>
  <architecture>
    <key-components>
      <component name="resource.ts">Core resource factory, fetch orchestration, abort handling, retry, polling</component>
      <component name="cache.ts">Fetcher-scoped nested cache with global LRU eviction, TTL/staleTime, batch operations, network status</component>
      <component name="types.ts">TypeScript interfaces and type utilities</component>
    </key-components>
    <data-structures>
      <structure name="CacheMap (nested, fetcher-scoped)">
        <field name="outer">Map&lt;fetcher, Map&lt;key, CacheEntry&gt;&gt; — outer key is fetcher function reference (isolates resources)</field>
        <field name="inner">Inner key is cache key from options.key</field>
        <field name="PUBLIC_SCOPE">Sentinel used for manual resourceCache.set() entries</field>
      </structure>
      <structure name="FlatCacheView (public API view over nested cache)">
        <field name="size">Total entries across all fetcher scopes</field>
        <field name="get(key)">CacheEntry | undefined — searches all scopes</field>
        <field name="has(key)">boolean — searches all scopes</field>
        <field name="clear()">Clears all scopes</field>
      </structure>
      <structure name="Resource">
        <field name="data">() =&gt; TTransformed | undefined — Reactive cached data (transformed if transform used)</field>
        <field name="error">() =&gt; ResourceError | undefined — Structured error info</field>
        <field name="isLoading">() =&gt; boolean — True only for initial load (no data yet)</field>
        <field name="isFetching">() =&gt; boolean — True for any network activity</field>
        <field name="isIdle">() =&gt; boolean — True if never fetched</field>
        <field name="status">() =&gt; ResourceStatus — Computed: idle|loading|success|error</field>
        <field name="fetch">(options?) =&gt; void — Cache-first fetch (force: true bypasses cache)</field>
        <field name="abort">() =&gt; void — Cancel and reset</field>
        <field name="invalidate">() =&gt; void — Clear cache and refetch</field>
        <field name="setData">(T | (old =&gt; T)) =&gt; void — Update cached value (raw type)</field>
        <field name="cacheKey">() =&gt; unknown — Current cache key</field>
        <field name="mutate">&lt;TVariables&gt;(vars) =&gt; Promise&lt;T&gt; — Execute mutation (returns raw type)</field>
        <field name="reset">() =&gt; void — Return to initial state</field>
        <field name="dispose">() =&gt; void — Cleanup effects/timers/subscriptions</field>
      </structure>
      <structure name="CacheEntry">
        <field name="data">T — Cached value</field>
        <field name="timestamp">number — Creation time for TTL</field>
        <field name="cacheTime">number — TTL duration in ms</field>
        <field name="staleTime">number — Fresh duration in ms (Infinity = never stale)</field>
        <field name="lastAccess">number — Last read time for LRU</field>
      </structure>
      <structure name="OngoingRequest (deduplication map)">
        <field name="promise">Promise&lt;T&gt; — Shared fetch promise</field>
        <field name="abortController">AbortController — Shared abort control</field>
        <field name="subscribers">Set&lt;(result, error) =&gt; void&gt; — Waiting resources</field>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="cache-first-fetch (run function)">
        <purpose>Orchestrate cache lookup, deduplication, SWR, and request execution</purpose>
        <strategy>Three-phase waterfall with early exits</strategy>
        <step>Cache phase: Check TTL-valid cached data, return immediately if hit</step>
        <step>SWR phase: If staleTime configured and data is stale, return cached + background fetch</step>
        <step>Deduplication phase: Join ongoing request if same key, share abort controller</step>
        <step>Request phase: Create AbortController, race fetcher vs abort, cache result</step>
        <insight>Uses untracked() when resolving key to prevent creating reactive dependencies during fetch execution</insight>
      </algorithm>
      <algorithm name="stale-while-revalidate (SWR)">
        <purpose>Return stale data immediately while fetching fresh data in background</purpose>
        <strategy>Time-based freshness check</strategy>
        <detail>staleTime: Duration data is considered fresh (default: Infinity)</detail>
        <detail>cacheTime: Duration data stays in cache (default: 0)</detail>
        <detail>When stale: fetch() returns cached data + triggers background fetch</detail>
        <detail>isFetching = true during background refresh, isLoading = false (has data)</detail>
        <timeline>With staleTime: 30000, cacheTime: 300000 — 0-30s: Fresh (instant return); 30s-5min: Stale (return + background fetch); 5min+: Expired (fresh network request)</timeline>
      </algorithm>
      <algorithm name="retry-logic">
        <purpose>Automatic retry on failure with configurable strategies</purpose>
        <strategy>Loop with delay and conditional checks</strategy>
        <detail>retry: Number, boolean, or (count, error) =&gt; boolean</detail>
        <detail>retryDelay: Number or (attempt, error) =&gt; number</detail>
        <detail>Abort during retry delay: Checks signal and exits cleanly</detail>
        <detail>Retry count resets between requests</detail>
      </algorithm>
      <algorithm name="request-deduplication">
        <purpose>Prevent duplicate concurrent network calls for identical keys</purpose>
        <strategy>Nested map keyed by fetcher then cache key (same pattern as cache)</strategy>
        <step>First request creates entry with promise, abortController, subscribers Set</step>
        <step>Subsequent requests with same fetcher + key join existing promise</step>
        <step>All subscribers switch to shared abortController</step>
        <step>Promise completion notifies all subscribers and cleans up map entry</step>
        <step>Force refresh (request vs get) bypasses deduplication</step>
        <insight>Eliminates thundering herd when multiple components mount simultaneously requesting same data</insight>
      </algorithm>
      <algorithm name="abort-handling">
        <purpose>Cancellable async operations with graceful state management</purpose>
        <strategy>Promise.race with AbortSignal</strategy>
        <step>Create AbortController per request, store as currentAbortController</step>
        <step>External abortSignal listeners added to internal controller</step>
        <step>Timeout creates timer that calls abort(), clears on abort event</step>
        <step>Fetcher races against abort promise that rejects with DOMException</step>
        <step>AbortError caught specially: sets loading=false WITHOUT error state</step>
        <step>Signal captured before async to prevent race conditions</step>
        <edge-cases>Already-aborted external signal, timeout during deduplication, abort during mutation, abort during retry delay</edge-cases>
      </algorithm>
      <algorithm name="polling-interval-refetch">
        <purpose>Periodic data refresh for real-time updates</purpose>
        <strategy>Recursive setTimeout with visibility awareness</strategy>
        <detail>refetchInterval: Number, false, or (data) =&gt; number | false</detail>
        <detail>refetchIntervalInBackground: Continue when tab hidden (default: false)</detail>
        <detail>Skipped execution when tab hidden (unless background enabled)</detail>
        <detail>Cleanup on dispose/abort/reset</detail>
      </algorithm>
      <algorithm name="window-focus-reconnect">
        <purpose>Refetch on user attention or network recovery</purpose>
        <strategy>Global event listeners</strategy>
        <detail>refetchOnWindowFocus: visibilitychange listener</detail>
        <detail>refetchOnReconnect: Uses resourceCache.onOnlineChange</detail>
        <detail>Cleanup on dispose</detail>
      </algorithm>
      <algorithm name="lru-cache-eviction">
        <purpose>Bound memory usage while keeping hot data</purpose>
        <strategy>Global lazy eviction on cache write</strategy>
        <step>Compute totalSize across all fetcher scopes after setCacheData</step>
        <step>Calculate entriesToEvict = totalSize - maxSize</step>
        <step>Flatten all entries across scopes, sort by lastAccess ascending</step>
        <step>Delete oldest entriesToEvict entries from their respective scopes</step>
        <step>getCacheData updates lastAccess on read</step>
        <performance-note>O(n log n) sort only when eviction needed, throttled cleanup batches 100 entries</performance-note>
      </algorithm>
      <algorithm name="data-transformation">
        <purpose>Transform data before returning while caching raw data</purpose>
        <strategy>Computed signal wrapper</strategy>
        <detail>transform: (data: T) =&gt; TTransformed</detail>
        <detail>Cache stores raw data (T)</detail>
        <detail>data() returns transformed (TTransformed)</detail>
        <detail>setData and mutate work with raw type (T)</detail>
        <insight>Multiple resources with different transforms can share cache</insight>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="early-cache-returns">Two-level map lookup (fetcher then key), no promise allocation</optimization>
    <optimization name="deduplication-map-reuse">Shared promise reduces fetch overhead</optimization>
    <optimization name="throttled-cleanup">60s minimum interval, 100 entry batch limit</optimization>
    <optimization name="lazy-lru-eviction">Only sort on exceeding maxSize</optimization>
    <optimization name="signal-capture">Prevents race checking signal.aborted multiple times</optimization>
    <optimization name="computed-transform">Applied on read, always fresh</optimization>
    <memory-management>
      <item>Fetcher-scoped cache isolates resources automatically, public API provides flat view</item>
      <item>LRU eviction enforces maxSize boundary</item>
      <item>Deduplication map auto-cleans on promise settlement</item>
      <item>Effect cleanup on resource recreation via dispose()</item>
      <item>AbortController cleanup via event listeners</item>
      <item>Polling/focus/reconnect listeners cleaned on dispose()</item>
    </memory-management>
  </performance>
  <non-obvious-behaviors>
    <behavior>fetch vs fetch({ force: true }) — default checks cache first, force bypasses cache</behavior>
    <behavior>AbortError doesn't set error state — keeps status="idle" not "error"</behavior>
    <behavior>Deduplication switches abort controller — later requests adopt ongoing controller</behavior>
    <behavior>Auto-fetch disabled by default — prevents unexpected network on creation</behavior>
    <behavior>Mutations bypass cache/deduplication — always execute fresh</behavior>
    <behavior>setData with cacheTime=0 does nothing — no cache writes when caching disabled</behavior>
    <behavior>resolveKey handles both function and value — typeof check for (() =&gt; K) | K overload</behavior>
    <behavior>enabled accepts a getter — static booleans are evaluated once at creation; a getter is re-evaluated reactively for automatic fetches, while manual fetch() bypasses the check</behavior>
    <behavior>Status computation checks initialData — remains "idle" until different value</behavior>
    <behavior>Force fetch still uses deduplication map — registers promise but doesn't check for existing</behavior>
    <behavior>Cleanup throttling uses closure variable — lastCleanupTime outside function for persistence</behavior>
    <behavior>invalidateResources executes immediately — invalidates all provided resources in batch</behavior>
    <behavior>onSettled NOT called on mutation abort — if mutation is aborted, onSettled is skipped even if onMutate already ran</behavior>
    <behavior>External abort and timeout compose — both listen to same internal AbortController</behavior>
    <behavior>Cache entries survive resource disposal — fetcher-scoped cache outlives individual resource instances</behavior>
    <behavior>Cache is fetcher-scoped — resources with different fetchers get isolated cache scopes even with the same key; resources sharing the same fetcher share cache scope (correct for transform/dedup patterns)</behavior>
    <behavior>resourceCache.map is a flat view — returns CacheMapView that searches across all fetcher scopes, not the raw nested Map</behavior>
    <behavior>resourceCache.set uses PUBLIC_SCOPE — manual cache writes go to a public scope; resource writes go to fetcher scopes; these are independent even with the same key</behavior>
    <behavior>LRU eviction is global — eviction considers total entries across all fetcher scopes, not per-scope</behavior>
    <behavior>updateCacheData returns false on miss — indicates update failed, useful for conditional logic</behavior>
    <behavior>LRU sorts entire cache — no heap/tree optimization, acceptable for configured limits</behavior>
    <behavior>Promise.race abort pattern — reject promise wraps abort listener to propagate cancellation</behavior>
    <behavior>isLoading vs isFetching — isLoading=true only when no data, isFetching=true for any network</behavior>
    <behavior>staleTime default is Infinity for resources, 0 for resourceCache.set — resources pass staleTime ?? Infinity to cache; direct resourceCache.set() defaults staleTime to 0</behavior>
    <behavior>revalidateOnStale default is true — background fetch triggers when stale</behavior>
    <behavior>transform creates computed signal — transform applied on every data() access</behavior>
    <behavior>Polling requires refetchOnKeyChange:true — without refetchOnKeyChange, polling doesn't start</behavior>
    <behavior>Retry delay is checked for abort — long delays can be interrupted by abort</behavior>
    <behavior>invalidateByPrefix only matches strings — non-string keys ignored by pattern matching</behavior>
    <behavior>refetchOnKeyChange skips nullish keys — when an explicit key is provided and resolves to null/undefined, the effect-driven fetch is skipped; resources without an explicit key always fetch</behavior>
  </non-obvious-behaviors>
</resource-package-instructions>
