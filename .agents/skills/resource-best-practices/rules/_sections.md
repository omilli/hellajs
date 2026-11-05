| prefix | title | impact | description |
|---|---|---|---|
| res | The resource primitive | HIGH | fetcher identity and cache scope, structural keys, reactive key fetching, state flags, transforms |
| cache | Cache management | HIGH | cacheTime gating, SWR windows, scoped writes, invalidation tools, LRU config, prefetch, factory reset |
| mut | Mutations | CRITICAL | optimistic updates with rollback context, concurrent-call isolation, rejecting promises, invalidation wiring |
| ctl | Fetch control and lifecycle | HIGH | dedup joins, abort/timeout/dispose, retry, polling, focus and reconnect, offline pausing, structural sharing |
| ssr | Server rendering | HIGH | render-time fetch no-op with initialData handoff, unguarded mutations |
