---
name: resource-best-practices
description: Best practices for @hellajs/resource reactive data fetching: resource, resourceCache, resetResource. Use when writing or reviewing code that imports @hellajs/resource - fetching with resource(url) or resource(fetcher), reactive keys (key, refetchOnKeyChange, keepPreviousData), SWR via staleTime, cache management through resourceCache (set, invalidateByPrefix, invalidateByPattern, invalidateAll, prefetch, setConfig), mutations via mutate with onMutate/onSettled, retry, polling (refetchInterval), timeout and abortSignal, pauseWhenOffline, resetResource. Silent failure modes: inline fetchers get isolated cache scopes so identical URLs never share cache, Date and Map keys compare by reference so rebuilt keys miss, aborts never set error(), mutate rejects while fetch never does, onSettled is skipped when a mutation aborts, invalidates deletes cache without refetching mounted resources. Use ONLY for @hellajs/resource data fetching - routing to router-best-practices, reactive state to core/store-best-practices.
---

# resource-best-practices

Grounded rules for `@hellajs/resource`: `resource()` wraps an async fetcher in reactive primitives (a `computed` for data, signals for error and loading flags) with a fetcher-scoped TTL/LRU cache, request deduplication, SWR, abort/timeout, retry, polling, focus/reconnect refetch, offline pausing, and promise-based mutations. `resourceCache` is the global cache singleton; `resetResource` is the factory reset. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any code importing `@hellajs/resource` or creating resources with `resource()`.
- Managing, seeding, warming, or invalidating the fetcher cache through `resourceCache`.
- Writing mutations with `mutate()`, optimistic updates, or the `onMutate`/`onSettled` hooks.
- Wiring refetch triggers: polling, window focus, reconnect, offline deferral, retry, timeout, abort.

Not for: routing and route data loading (`router-best-practices`), plain reactive state without async fetching (`core-best-practices`, `store-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| res | The resource primitive | HIGH |
| cache | Cache management | HIGH |
| mut | Mutations | CRITICAL |
| ctl | Fetch control and lifecycle | HIGH |
| ssr | Server rendering | HIGH |

## Rules

### The resource primitive (res)

- `res-share-fetcher-scope` - Share one named fetcher to share cache and dedup scope
- `res-structural-keys` - Build keys from primitives and plain objects
- `res-reactive-key-fetch` - Turn on refetchOnKeyChange for reactive keys
- `res-keep-previous-data` - Set keepPreviousData false for per-key loading windows
- `res-read-state-flags` - Read isLoading, isFetching, and status; aborts never set error
- `res-transform-raw-data` - Keep transforms on the raw data plane

### Cache management (cache)

- `cache-opt-in-cachetime` - Opt into caching with cacheTime
- `cache-pair-staletime-swr` - Pair staleTime with cacheTime for stale-while-revalidate
- `cache-public-scope` - resourceCache.set writes a separate public scope
- `cache-choose-invalidation` - Pick the right invalidation tool
- `cache-write-through-updaters` - Write cache updates through setData, update, and updateMultiple
- `cache-config-lru` - Configure the global LRU through setConfig
- `cache-reset-vs-invalidateall` - Use resetResource for factory resets, invalidateAll for cache only
- `cache-prefetch-warm` - Warm caches with prefetch and a shared fetcher reference

### Mutations (mut)

- `mut-optimistic-rollback` - Thread optimistic updates through onMutate context
- `mut-guard-concurrent` - Guard triggers that must not overlap
- `mut-catch-rejection` - Catch mutate calls; fetch never rejects but mutate does
- `mut-invalidates-list` - Wire mutation success to cache cleanup with invalidates

### Fetch control and lifecycle (ctl)

- `ctl-dedup-join` - Let deduplication join concurrent reads
- `ctl-abort-timeout-dispose` - Use abort, reset, and dispose for their distinct lifecycles
- `ctl-retry-shapes` - Pick retry counts, predicates, and delays
- `ctl-polling-intervals` - Poll with refetchInterval standalone
- `ctl-focus-reconnect` - Refetch on focus and reconnect without auto-fetch
- `ctl-offline-pause` - Defer offline fetches with pauseWhenOffline
- `ctl-structural-sharing` - Preserve subtree references with structuralSharing

### Server rendering (ssr)

- `ssr-no-render-fetch` - Fetch server data directly and seed initialData
- `ssr-mutate-unguarded` - Never call mutate during render

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).
