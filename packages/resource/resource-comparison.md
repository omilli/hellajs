# HellaJS @hellajs/resource vs. TanStack Query / SWR / RTK Query / Solid createResource / VueUse useFetch

A ground-up comparison based on the actual source code of `@hellajs/resource` v2. Every claim below was verified against `packages/resource/lib/`.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS resource | TanStack Query | SWR | RTK Query | Solid `createResource` | VueUse `useFetch` |
|---|---|---|---|---|---|---|
| Reactive model | Signals (`@hellajs/core`) | Framework observers (React/Vue/Svelte/Solid adapters) | React hooks (redux-ish store) | Redux store + observers | Solid signals | Vue refs |
| Caching model | Fetcher-scoped nested Map + global LRU | Single QueryCache keyed by `queryKey` | Single cache keyed by SWR key | Redux slice keyed by endpoint+arg | None (delegates to user storage) | None |
| Deduplication | `WeakMap<fetcher, Map<key, OngoingRequest>>` sharing promise + AbortController | Per-query observer tracking | 2 s `dedupingInterval` time window | Subscription counting per endpoint | Implicit via Suspense boundaries | None |
| Stale-while-revalidate | `staleTime` + background refetch | `staleTime` + `gcTime` + refetchOn* | `revalidateIfStale` + refetchOn* | `refetchOnMountReconnect` | None built-in | None |
| Mutations | `mutate()` with `onMutate`/`onSettled` (rollback context) | `useMutation` with `onMutate`/`onSuccess`/`onSettled` + invalidation | `mutate()` with `populateCache`/`revalidate`/`rollbackOnError` | `useMutation` + `invalidatesTags` | `mutate` setter (no hooks) | None (write your own) |
| Retry & polling | `retry`/`retryDelay` + `refetchInterval` (dynamic) + visibility-aware | `retry` (3 / exp backoff default) + `refetchInterval` | `shouldRetryOnError` + `errorRetryCount` + `refreshInterval` | `retry` + `pollingInterval` | None built-in | `timeout` only |
| Gzipped size | ~4.1 KB (min+gzip) / ~5.9 KB + core peer | ~13–14 KB (react-query) | ~4–5 KB | ~9 KB (on top of RTK) | Part of solid-js (~7 KB total) | 2.3 kB |
| External deps | 0 + `@hellajs/core` peer | 0 (adapter bundles framework peer) | 0 (React peer) | Redux Toolkit + Immer + React-Redux | 0 (solid-js) | 0 (Vue peer) |
| Framework coupling | None — reactive object, consume anywhere | React/Vue/Svelte/Solid adapters | React-only | Redux + React-Redux | Solid-only | Vue-only |
| API shape | Factory returning reactive getters + control methods | `useQuery({ queryKey, queryFn, ...options })` hook | `useSWR(key, fetcher, options)` hook | `createApi({ endpoints })` → auto-generated hooks | `[resource, { mutate, refetch }] = createResource(source, fetcher, options)` | `const { data, error, ... } = useFetch(url, options)` |

HellaJS sits between Solid's `createResource` (closest architectural sibling — signal-based, factory function) and the React-centric libraries (TanStack Query, SWR, RTK Query). It is the only one here that combines (a) a signal-based reactivity model with no framework coupling, (b) a fetcher-scoped cache that auto-isolates resources by fetcher identity, and (c) the full SWR/retry/polling/mutation feature set of TanStack Query — in roughly a third of the bytes.

---

## 2. Architecture & Caching

### HellaJS

- The cache is a **nested `Map<fetcher, Map<key, CacheEntry>>`** stored in a single module-level `cacheMap` (`lib/cache.ts`). Each resource's cache scope is keyed by the fetcher function reference, so resources with different fetchers never collide even when they produce identical key values (`lib/cache.ts`). Resources that share the same fetcher function share a scope, which is the correct behavior for the transform pattern where multiple resources derive different views from one cached payload.
- Each entry stores `data`, `timestamp`, `cacheTime` (TTL), `staleTime` (freshness), and `lastAccess` (LRU) (`lib/types/cache.d.ts`, `lib/cache.ts`).
- The public `resourceCache.map` is a `CacheMapView` that flattens the nested structure into a single read-only `get`/`has`/`size`/`clear` interface (`lib/cache.ts`); manual `resourceCache.set()` writes go to a separate `PUBLIC_SCOPE` symbol (`lib/cache.ts`, `lib/cache.ts`) so they never collide with fetcher-scoped entries.
- The cache survives resource disposal: individual resources read from and write to the global cache, but the cache itself is keyed by fetcher identity and lives independently (`lib/cache.ts`).

### TanStack Query

- One global `QueryCache` keyed by serializable `queryKey` (arrays/objects). A query has `state.data`, `state.dataUpdatedAt`, `state.status`, `state.fetchStatus`, plus observers that subscribe components. The cache and the subscription system are tightly coupled — there is no fetcher-scoped isolation; key identity is the only boundary (per [Queries docs](https://tanstack.com/query/latest/docs/framework/react/guides/queries) and [Caching guide](https://tanstack.com/query/latest/docs/framework/react/guides/caching)).

### SWR

- A single global cache keyed by the SWR `key` (string, function, or array). SWR uses a `Cache` instance (default: a `Map`-backed global cache). There is no fetcher-scoping: keys and fetchers are passed separately to `useSWR(key, fetcher)`, and cache identity is purely key-based (per [SWR API](https://swr.vercel.app/docs/api)).

### RTK Query

- One API slice = one Redux slice. Cache entries are keyed by auto-generated `${endpointName}(${serializedArgs})`. The cache lifetime is governed by `keepUnusedDataFor` (default 60 s), with reference counting: when no component subscribes to an endpoint for `keepUnusedDataFor` seconds, the entry is GC'd (per [RTK Query Overview](https://redux-toolkit.js.org/rtk-query/overview)). Endpoints are declared up front in `createApi`.

### Solid `createResource`

- **No built-in cache.** `createResource` tracks state (`"unresolved" | "pending" | "ready" | "refreshing" | "errored"`) and exposes `state`, `loading`, `latest`, `error` as properties on the resource accessor (verified against `packages/solid/src/reactive/signal.ts` in the solidjs/solid repo, v1.9). An optional `storage` option lets users supply a custom signal factory for caching, but deduplication across resources requires manual coordination or a separate library. The only built-in cross-resource coordination is Suspense boundaries.

### VueUse `useFetch`

- **No cache, no deduplication.** `useFetch` is a thin reactive wrapper around `window.fetch`. Each call issues its own request and tracks local `data`/`error`/`isFetching`/`statusCode` refs (per [VueUse useFetch docs](https://vueuse.org/core/usefetch/), v14.3). The 2.3 kB size reflects this: it is the Fetch API made reactive, nothing more.

**Verdict:** HellaJS's fetcher-scoped nested cache is unique in this group — every competitor either uses a single global key-namespaced cache (TanStack/SWR/RTK Query) or skips caching entirely (Solid/VueUse). The fetcher-keyed design means two resources pointing at the "same" key with different fetchers automatically isolate, and resources that share a fetcher automatically share cache for transforms. The cost is a less obvious mental model: keys are not globally unique identifiers, they are namespaced by fetcher identity.

---

## 3. Bundle Size & Dependencies

|  | HellaJS (resource bundle, min+gzip) | HellaJS (resource + core, min+gzip) | TanStack Query (react) | SWR | RTK Query (with RTK) | VueUse `useFetch` |
|---|---|---|---|---|---|---|
| Min+gzip | ~4.1 KB | ~5.9 KB | ~13–14 KB | ~4–5 KB | ~9 KB (on top of RTK) | 2.3 kB |
| Source | `dist/sizes.json` | `dist/sizes.json` + core | bundlephobia | bundlephobia | RTK Query docs | VueUse docs |

- `@hellajs/resource` declares **zero** runtime dependencies and one peer dependency (`@hellajs/core`) (`packages/resource/package.json:27-29`). The built `dist/bundle.min.js` is **12.16 KB minified / 4.14 KB gzipped** per `dist/sizes.json`; adding the `@hellajs/core` peer (1.80 KB gzipped) puts the realistic floor at ~5.9 KB min+gzip. The package also publishes per-module builds under `dist/` (`cache.js`, `resource.js`, and the `internal/*` modules) for consumers who tree-shake rather than take the pre-bundled file.
- TanStack Query's `react-query` adapter bundles its own observer implementation on top of `query-core`. SWR ships its own cache, dedup logic, and React hook in ~4–5 KB. RTK Query is a ~9 KB add-on to Redux Toolkit (which itself pulls in Immer) — so the realistic floor is much higher than the add-on size suggests (per [RTK Query Overview](https://redux-toolkit.js.org/rtk-query/overview)).
- HellaJS is the only entry that treats reactivity as a peer concern: bring your own signals via `@hellajs/core`, or wire the reactive getters into any other framework's rendering layer manually.

---

## 4. Caching Model

HellaJS exposes cache configuration as a global singleton (`resourceCache.setConfig({ maxSize, enableLRU })` in `lib/cache.ts`) with a default `maxSize: 1000` and `enableLRU: true` (`lib/cache.ts`).

| Mechanism | HellaJS | TanStack Query | SWR | RTK Query | Solid | VueUse |
|---|---|---|---|---|---|---|
| Scope | Per fetcher (`lib/cache.ts`) | Global by key | Global by key | Per endpoint | User-supplied | None |
| TTL | `cacheTime` per entry (`lib/cache.ts`) | `gcTime` per query | `dedupingInterval` + provider TTL | `keepUnusedDataFor` | None | None |
| Freshness | `staleTime` per entry (`lib/cache.ts`) | `staleTime` per query | `revalidateIfStale` | implicit | None | None |
| Eviction | Global LRU, lazy on write (`lib/cache.ts`) | GC after `gcTime` inactive | No size-based eviction (time-based) | Reference-count GC | None | None |
| Batch ops | `updateMultiple`, `invalidateMultiple`, `invalidateByPrefix`, `invalidateByPattern`, `invalidateAll` (`lib/cache.ts`) | `invalidateQueries({ predicate })`, `removeQueries` | (none built-in) | `invalidateTags`, `resetApiState` | None | None |
| Cleanup | Throttled: 60 s interval, 100 entries per pass (`lib/cache.ts`, `lib/cache.ts`) | Per-query GC timers | Time-based | RTK middleware | None | None |

The LRU implementation is brute-force: on every write that exceeds `maxSize`, all entries across all scopes are flattened into an array, sorted by `lastAccess` ascending, and the oldest are deleted (`lib/cache.ts`). The AGENTS.md is candid about this ("No heap/tree optimization, acceptable for configured limits") — `O(n log n)` per eviction is fine at the default `maxSize: 1000`, but a workload with thousands of entries and high churn would feel it.

`getCacheData` updates `lastAccess` on read (`lib/cache.ts`), making the eviction policy a true LRU rather than FIFO.

---

## 5. Request Deduplication

HellaJS's dedup is structurally distinct. The `OngoingRequest` shape stores `{ promise, abortController }` (`lib/internal/dedupe.ts`) in a `WeakMap<object, Map<unknown, OngoingRequest>>` keyed by fetcher reference then cache key (`lib/internal/dedupe.ts`). When a second resource issues the same fetcher + key:

1. It looks up the in-flight request (`lib/resource.ts`).
2. It **switches its own `currentAbortController` to the shared one** (`lib/resource.ts`).
3. It awaits the shared promise and `handleSuccess` or `handleSuccessError` based on the outcome (`lib/resource.ts`).

This means an abort on one deduplicated caller aborts the shared request for all callers — and that's intentional, since they are the same logical request. The `WeakMap` keyed by fetcher also means entries are reclaimed automatically when a fetcher is garbage-collected (`lib/internal/dedupe.ts`).

The `force: true` flag bypasses the cache-phase lookup but still registers a new in-flight promise in the dedup map, so later non-force fetches can join a force-fetch in progress (`lib/resource.ts`). This is a subtle design choice — the docs and AGENTS.md both call it out as a non-obvious behavior.

| Library | Dedup strategy |
|---|---|
| HellaJS | `WeakMap<fetcher, Map<key, OngoingRequest>>`, shared promise + shared AbortController (`lib/internal/dedupe.ts`, `lib/resource.ts`) |
| TanStack Query | Per-query observer list; the query fetches once and broadcasts to all observers |
| SWR | `dedupingInterval` (default 2000 ms) — requests within the window share, afterwards they don't |
| RTK Query | Per-endpoint subscription count; only the first subscriber triggers a fetch, others join |
| Solid `createResource` | None beyond Suspense; multiple resources = multiple requests unless user coordinates |
| VueUse `useFetch` | None — every call issues a new request |

HellaJS is the only library that **keys deduplication by fetcher identity** rather than by key string alone. The advantage: two different fetchers that happen to produce the same key (e.g. two REST endpoints at `/users/1` with different response shapes) get isolated automatically. The disadvantage: passing an inline arrow function as a fetcher (`resource(async k => ...)` that is recreated each render) defeats both dedup and cache, since the WeakMap keys won't match.

---

## 6. Abort & Cancellation

HellaJS uses a `Promise.race` between the fetcher and an abort-reject promise (`lib/resource.ts`). The abort promise registers a one-shot listener on the internal `AbortController` and rejects with a `DOMException` named `"AbortError"` (`lib/resource.ts`). This pattern is the standard idiom for racing cancellation against work, and it correctly propagates the abort to whichever side fires first.

Three sources of abort compose onto the same internal controller:

- **External `abortSignal`**: if already aborted, the internal controller aborts immediately; otherwise a one-shot listener forwards the abort (`lib/resource.ts`). Same pattern used for mutations (`lib/resource.ts`).
- **`timeout`**: a `setTimeout` calls `abort()` after the configured ms; the timeout is cleared when the abort event fires, preventing leaks (`lib/resource.ts`).
- **`abort()` method**: calls `currentAbortController.abort()` and resets to `initialData` (`lib/resource.ts`).

A notable design choice: **AbortError does not set error state**. The `handleSuccessError` helper checks `isAbortError(err)` and only clears `isLoading`/`isFetching` without touching `error` (`lib/resource.ts`). The categorizer also classifies aborts as `"abort"` category in the `ResourceError` type but does not actually populate the signal when an abort fires (`lib/internal/errors.ts`, `lib/internal/errors.ts`). The docs are explicit that consumers should check `isIdle()` rather than `error()` after an abort. This is a divergence from TanStack Query, where a cancelled query silently transitions back to its previous state without surfacing an error.

Retry delays are abort-aware: the `await new Promise(...)` inside the retry loop registers an abort listener that clears the delay timeout and resolves early, then the loop checks `currentSignal.aborted` before retrying (`lib/resource.ts`). Long exponential backoffs can be interrupted.

| Library | Abort mechanism |
|---|---|
| HellaJS | Per-request `AbortController`, `Promise.race`, external signal + timeout compose (`lib/resource.ts`) |
| TanStack Query | `AbortSignal` passed to `queryFn` via `signal`; `CancelToken`-style cleanup |
| SWR | `signal` passed to fetcher; per-request `AbortController` |
| RTK Query | `signal` passed to `baseQuery`; per-query abort |
| Solid `createResource` | None built-in; user must thread signal manually |
| VueUse `useFetch` | `abort()` method, `timeout` option, `canAbort` flag |

---

## 7. Mutations & Optimistic Updates

HellaJS mutations live on the resource itself (`resource.mutate(variables)`), not on a separate hook. The mutation path bypasses cache and dedup entirely (`lib/resource.ts`):

1. `onMutate(variables)` runs first and may return a context object — this is the rollback snapshot (`lib/resource.ts`).
2. The fetcher is invoked via the same `Promise.race` abort pattern used for reads (`lib/resource.ts`).
3. On success: `handleSuccess` writes data and calls `onSuccess`; then `onSettled(result, undefined, variables, context)` fires (`lib/resource.ts`).
4. On failure: `onSettled(undefined, err, variables, context)` fires with the context, enabling rollback (`lib/resource.ts`).

A subtle behavior the test suite verifies explicitly: **`onSettled` is NOT called when a mutation is aborted** — even if `onMutate` already ran (`tests/mutations.test.ts`, `lib/resource.ts`). This is the opposite of TanStack Query's contract where `onError` and `onSettled` fire for failed mutations. The intent is that an abort is a *cancellation*, not a *failure*; if you stages-changes in `onMutate`, you are responsible for rolling them back yourself on abort.

On success, the optional `invalidates: Array<string | RegExp>` option drives cross-scope cache invalidation: strings dispatch to `resourceCache.invalidateByPrefix`, RegExps to `invalidateByPattern` (`lib/resource.ts`, `lib/types/resource.d.ts`). This deletes cache entries only — mounted resources do **not** auto-refetch; the next fetch for a matched key goes to the network. No invalidation runs on error or abort.

The read/write split uses two resources: one fetcher for reads, one fetcher for writes, with `onMutate` writing into the read resource via `setData` (documented in `docs/concepts/resources.mdx`).

| Library | Mutation API |
|---|---|
| HellaJS | `resource.mutate(vars)` with `onMutate`/`onSuccess`/`onError`/`onSettled` + `invalidates` (prefix/regex); same fetcher signature as reads (`lib/resource.ts`) |
| TanStack Query | `useMutation({ mutationFn, onMutate, onSuccess, onError, onSettled })` + `mutate(variables, options)` |
| SWR | `useSWRMutation(key, fetcher, options)` → `trigger(variables)` with `onSuccess`, `onError`, optimistic `updateData`/`revalidate`/`rollbackOnError`/`populateCache` |
| RTK Query | `endpoints: build.mutation()` → `useXMutation(); overrideApiResponse; invalidatesTags` for auto-refetch |
| Solid `createResource` | `mutate` is just a setter — no lifecycle hooks, no rollback context |
| VueUse `useFetch` | None — `useFetch` is read-only; you write via separate fetch calls |

HellaJS's mutation API is closest to TanStack Query's `useMutation`, but it has no `onQueryInvalidation` / `queryClient.invalidateQueries` equivalent built in — you call `otherResource.invalidate()` from inside `onSettled` to refetch reads (`lib/resource.ts`). There is also no concept of mutation tags (RTK Query's `invalidatesTags`/`providesTags`) — invalidation is explicit by resource reference or by cache key prefix/pattern (`lib/cache.ts`).

---

## 8. Stale-While-Revalidate

HellaJS separates two time windows: `cacheTime` (TTL — how long the entry lives in the cache) and `staleTime` (freshness — how long before a background refetch is triggered). On a cache hit:

1. The TTL check passes (`Date.now() - entry.timestamp < entry.cacheTime`) and the cached value is returned synchronously (`lib/resource.ts`).
2. If `staleTime` is configured and `isStale(entry)` is true and `revalidateOnStale` is true, a background `run(true)` is kicked off without awaiting, and `isFetching` becomes true while `isLoading` stays false (`lib/resource.ts`).

Defaults: `cacheTime` is `0` (no caching) and `staleTime` is `Infinity` for resources — meaning *by default resources are not cached at all*. This is the opposite of TanStack Query, which defaults `gcTime: 5 min` and `staleTime: 0` (immediately stale, aggressive refetch). HellaJS requires you to opt into caching by setting `cacheTime` to a positive number. The `resourceCache.set()` API defaults `staleTime` to `0` instead, so manual writes behave differently from resource-driven writes (`lib/cache.ts`, `lib/cache.ts`).

The dual-signal design is what enables the clean `isLoading` vs `isFetching` distinction that the docs emphasize. `isLoading` is `true` only when there is no data yet (`lib/resource.ts`); `isFetching` is `true` for any network activity including background refetch (`lib/resource.ts`). SWR calls this `isLoading` vs `isValidating`; TanStack splits it as `status` (`pending`/`error`/`success`) vs `fetchStatus` (`fetching`/`paused`/`idle`).

| Library | SWR implementation |
|---|---|
| HellaJS | Per-entry `staleTime`/`cacheTime`, explicit background refetch on hit (`lib/resource.ts`) |
| TanStack Query | `staleTime` + `refetchOnMount`/`refetchOnWindowFocus`/`refetchOnReconnect`, structural sharing for stable refs |
| SWR | Core feature — `revalidateIfStale`, `revalidateOnFocus`, `revalidateOnReconnect`, `keepPreviousData` |
| RTK Query | `refetchOnMountOrArgChange`, `refetchOnFocus`/`refetchOnReconnect` (via `setupListeners`) |
| Solid `createResource` | None — fetcher is re-invoked on source change only |
| VueUse `useFetch` | None — single request per call |

---

## 9. Retry & Polling

HellaJS normalizes retry config into a `RetryConfig` with `maxRetries`, `shouldRetry(count, error)`, and `getDelay(attempt, error)` (`lib/internal/retry.ts`). The `retry` option accepts a number, a boolean (`true` = retry once), or a predicate that receives the categorized error (`lib/types/resource.d.ts`). The retry loop is in `lib/resource.ts`:

```typescript
// Exponential backoff with conditional retry
retry: (count, err) => err.category !== "not_found" && count < 3,
retryDelay: (n) => Math.min(1000 * 2 ** (n - 1), 30000),
```

Defaults: `retry: 0` (no retries) and `retryDelay: 1000` ms (`lib/resource.ts`). This is another divergence from TanStack Query, which defaults to 3 retries with exponential backoff — the assumption being that a library-level default of "no retries" forces the developer to think about retry semantics rather than getting surprise thundering-herd retry storms.

Polling is implemented as recursive `setTimeout` so each tick can recompute a dynamic interval from the latest data (`lib/internal/polling.ts`). The interval can be a number, `false` to disable, or a function `(data) => number | false` (`lib/types/resource.d.ts`). Visibility-aware: ticks are skipped when `document.visibilityState === "hidden"` unless `refetchIntervalInBackground` is set (`lib/internal/polling.ts`).

A non-obvious constraint: **polling requires `refetchOnKeyChange: true` to start at all** (`lib/resource.ts`). The same gate applies to focus/reconnect listeners — they are set up unconditionally if their flags are on (`lib/resource.ts`), but polling specifically gates on `refetchOnKeyChange && enabled && refetchInterval`. The reasoning: without an effect driving fetches, the polling timer has nothing to schedule against on first run.

Window focus uses `visibilitychange` not `focus` (`lib/internal/lifecycle.ts`); reconnect uses `resourceCache.onOnlineChange`, which is backed by global `online`/`offline` listeners on `window` (`lib/cache.ts`, `lib/internal/lifecycle.ts`).

| Library | Retry | Polling |
|---|---|---|
| HellaJS | Configurable count/boolean/predicate + delay fn (`lib/internal/retry.ts`) | `refetchInterval` number/fn + visibility-aware + `refetchIntervalInBackground` (`lib/internal/polling.ts`) |
| TanStack Query | 3 retries + exp backoff (default) | `refetchInterval` + `refetchIntervalInBackground` |
| SWR | `shouldRetryOnError` + `errorRetryCount` + `errorRetryInterval` | `refreshInterval` + `refreshWhenHidden` + `refreshWhenOffline` |
| RTK Query | `retry` (number of attempts) | `pollingInterval` + `skipPollingIfUnfocused` |
| Solid `createResource` | None | None |
| VueUse `useFetch` | None | None |

---

## 10. Built-in Features Matrix

| Feature | HellaJS | TanStack Query | SWR | RTK Query | Solid `createResource` | VueUse `useFetch` |
|---|---|---|---|---|---|---|
| Cache TTL (`cacheTime`/`gcTime`) | Per-entry (`lib/cache.ts`) | Per-query | Global | Per-endpoint | None | None |
| Stale time (`staleTime`) | Per-entry (`lib/cache.ts`) | Per-query | `revalidateIfStale` | implicit | None | None |
| LRU eviction | Global, `maxSize` configurable (`lib/cache.ts`) | Inactive GC | None | Ref-count GC | None | None |
| Fetcher-scoped cache | `Map<fetcher, …>` (`lib/cache.ts`) | No | No | No | No | No |
| Request deduplication | `WeakMap<fetcher, Map<key, …>>` (`lib/internal/dedupe.ts`) | Per-query observer | Time-windowed | Per-endpoint subscriptions | None | None |
| Shared `AbortController` for dedup'd requests | Yes (`lib/resource.ts`) | Per-query signal | Per-key signal | Per-endpoint signal | None | None |
| External `AbortSignal` composition | Yes (`lib/resource.ts`) | Yes | Yes | Yes | Manual | Manual |
| Request timeout | Built-in (`lib/resource.ts`) | Via signal in fetcher | Via signal in fetcher | Via signal in baseQuery | Manual | Built-in |
| Retry with predicate + custom delay | Yes (`lib/internal/retry.ts`) | Yes | Limited | Yes | None | None |
| Stale-while-revalidate | Yes (`lib/resource.ts`) | Yes | Yes (core feature) | Limited | None | None |
| Polling (fixed + dynamic) | Yes (`lib/internal/polling.ts`) | Yes | Yes | Yes | None | None |
| Refetch on focus / reconnect | Yes (`lib/internal/lifecycle.ts`) | Yes | Yes | Yes (via `setupListeners`) | None | None |
| Mutations with rollback context | Yes (`lib/resource.ts`) | Yes | Yes | Yes | No | No |
| Optimistic updates via `setData` / `mutate` | Yes (`lib/resource.ts`) | Yes | Yes | Yes | Yes (manual) | No |
| Data transformation (cache raw, read transformed) | Yes, via `computed` (`lib/resource.ts`) | `select` option | No | `transformResponse` | Manual | No |
| Structural sharing (referential stability) | Opt-in via `structuralSharing` (`lib/internal/structural.ts`) | Default on | No | No | No | No |
| Prefetch without a resource | `resourceCache.prefetch(...)` (`lib/cache.ts`) | `queryClient.fetchQuery`/`prefetchQuery` | `preload` | `initiate` | None | None |
| Batch invalidation (prefix/pattern/regex) | Yes (`lib/cache.ts`) | `invalidateQueries({ predicate })` | No | `invalidateTags` | No | No |
| Structured error category | Yes (`lib/internal/errors.ts`) | Error instance | Error instance | Error instance | Error instance | Error instance |
| Framework-agnostic reactive object | Yes | No (adapters) | React-only | Redux-bound | Solid-only | Vue-only |

### Notable HellaJS differentiators

- **Fetcher-scoped cache isolation** — the nested `Map<fetcher, Map<key, …>>` design means resources with different fetchers get isolated cache scopes even with identical keys, while resources sharing a fetcher share cache scope (correct for transform patterns) (`lib/cache.ts`, `lib/cache.ts`).
- **Dedup keyed by fetcher identity via `WeakMap`** — automatic reclaim when fetcher is GC'd; in-flight requests share both promise and AbortController (`lib/internal/dedupe.ts`, `lib/resource.ts`).
- **Public vs fetcher scope separation** — manual `resourceCache.set()` writes go to a `PUBLIC_SCOPE` symbol that never collides with resource-driven entries, even with the same key (`lib/cache.ts`, `lib/cache.ts`).
- **Cache isolation survives disposal** — cache entries outlive individual resource instances; only the resource is disposable, the fetcher-keyed cache persists (`lib/resource.ts`).
- **Transform via `computed` signal** — raw data is cached, `data()` returns a transformed view via `@hellajs/core`'s `computed`, so transforms always read through to current raw data (`lib/resource.ts`).
- **Opt-in structural sharing** — `structuralSharing` reuses unchanged plain-object/array subtree references on fetch success so dependent computeds skip re-evaluation; `Map`/`Set`/`Date`/class instances use strict equality and are never merged (`lib/internal/structural.ts`).
- **`untracked(resolveKey)` during fetch** — resolves the key without creating reactive dependencies in the fetch pipeline, so fetch logic doesn't accidentally subscribe to signals (`lib/resource.ts`).
- **Pattern-based batch invalidation** — `invalidateByPrefix(prefix)` and `invalidateByPattern(regex)` operate across all fetcher scopes at once (`lib/cache.ts`).
- **`onSettled` suppressed on abort** — aborted mutations skip `onSettled` even if `onMutate` ran, treating abort as cancellation not failure (`lib/resource.ts`, `tests/mutations.test.ts`).
- **Online/offline subscription reusable across resources** — `resourceCache.onOnlineChange(cb)` exposes the underlying network-status callback set so non-resource code can subscribe too (`lib/cache.ts`).

---

## 11. Ergonomics & Syntax

```typescript
import { signal, effect } from "@hellajs/core";
import { resource, resourceCache } from "@hellajs/resource";

// URL overload — URL doubles as cache key
const config = resource("/api/config", { cacheTime: 60_000 });

// Fetcher overload — key may be a function (reactive) or value (static)
const userId = signal(1);
const user = resource(
  (id: number) => fetch(`/api/users/${id}`).then(r => r.json()),
  {
    key: () => userId(),
    refetchOnKeyChange: true,
    cacheTime: 60_000,
    staleTime: 30_000,
    retry: (n, err) => err.category !== "not_found" && n < 3,
    retryDelay: n => Math.min(1000 * 2 ** (n - 1), 30_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    transform: u => u.name,
  }
);

// Reactive state — pass getters to anything that consumes signals
effect(() => console.log(user.isLoading(), user.isFetching(), user.data()));

// Control methods
user.fetch();                    // cache-first
user.fetch({ force: true });     // bypass cache
user.invalidate();               // clear cache entry + refetch
user.setData(old => ({ ...old, lastSeen: Date.now() }));
user.abort();                    // cancel + reset to initialData
user.reset();                    // back to idle, reusable
user.dispose();                  // one-way teardown

// Mutation (same resource, with optimistic update against another resource)
const writer = resource(
  async (patch: Partial<User>) => fetch("/api/users/1", { method: "PATCH", body: JSON.stringify(patch) }).then(r => r.json()),
  {
    onMutate: async patch => ({ previous: user.data() }),
    onSettled: (_data, err, _vars, ctx) => {
      if (err && ctx?.previous) user.setData(ctx.previous);
      user.invalidate();
    },
  }
);
await writer.mutate({ name: "Alice" });

// Global cache operations
resourceCache.invalidateByPrefix("user:");
resourceCache.invalidateByPattern(/^user:\d+:posts$/);
resourceCache.invalidateResources([user]);
resourceCache.setConfig({ maxSize: 5000 });
```

The shape — a factory returning an object with reactive getters and control methods — is closer to Solid's `createResource` than to TanStack/SWR/RTK Query's hooks. The differences vs Solid: HellaJS returns a flat object (no `[resource, actions]` destructuring), the `data` getter is a transformed `computed` when `transform` is supplied (`lib/resource.ts`), and there is a real cache underneath. The differences vs TanStack Query: there is no `queryKey` array — the key is whatever the `key` option resolves to, scoped by fetcher. There is no `select` option — `transform` is set at resource creation time, not at subscription time.

The explicit-prefix attribute convention (`fetch({ force: true })`, `setData(old => ...)`) is closer to TanStack Query's option-bag API than to SWR's bare `mutate(data, options)`. The factory pattern means resources are plain objects you can pass around — they are not tied to a hook lifecycle. This is also a limitation: there is no built-in "hooks" layer, so integrating into React requires a small adapter.

---

## Bottom Line

Architecturally, HellaJS resource is the closest sibling to Solid's `createResource` — a signal-based factory function returning reactive state — but with the full feature set of TanStack Query layered on (cache, dedup, SWR, retry, polling, mutations, abort). It is the only library in this comparison that is simultaneously (a) framework-agnostic at the reactivity layer, (b) features a fetcher-scoped cache rather than a single global key namespace, and (c) ships in the same size class as VueUse's `useFetch` (~4.1 KB min+gzip) while offering strictly more.

What sets HellaJS apart — and no single competitor matches all of:

1. **Fetcher-scoped cache** — `Map<fetcher, Map<key, …>>` isolates resources by fetcher identity, not by global key string. TanStack/SWR/RTK Query all use global key namespaces; Solid/VueUse don't cache at all (`lib/cache.ts`).
2. **Framework-agnostic reactive object** — the returned resource is a plain object of signal getters and methods; it is not a hook, not bound to React/Vue/Solid, and can be consumed anywhere `@hellajs/core` signals work. TanStack Query requires framework-specific adapters (`@tanstack/react-query`, `@tanstack/vue-query`, etc.); SWR is React-only; RTK Query requires Redux; Solid/VueUse are framework-bound.
3. **`WeakMap`-keyed dedup with shared `AbortController`** — concurrent identical requests share both the promise and the abort controller, so a `force: true` fetch that registers in the dedup map can be joined by later non-force fetches. No competitor composes abort through the dedup layer (`lib/internal/dedupe.ts`, `lib/resource.ts`).
4. **Public-scope vs fetcher-scope cache separation** — `resourceCache.set()` writes go to a `PUBLIC_SCOPE` symbol that can never collide with resource-driven entries. No competitor has this isolation primitive (`lib/cache.ts`).
5. **Default-off caching and retry** — `cacheTime: 0` and `retry: 0` defaults force the developer to opt in, where TanStack Query's defaults are aggressive (5 min `gcTime`, immediate staleness, 3 retries). The choice is opinionated but defensible: it eliminates surprise network behavior on first use.
6. **Pattern + prefix batch invalidation across all scopes** — `invalidateByPrefix` / `invalidateByPattern` operate cross-scope in one call (`lib/cache.ts`). TanStack Query has `invalidateQueries({ predicate })` but a single-scope cache; RTK Query has `invalidateTags`; SWR/Solid/VueUse have nothing equivalent.
7. **Mutation abort suppresses `onSettled`** — cancelled mutations skip the settled hook even if `onMutate` already ran, treating abort as cancellation not failure. TanStack Query's mutation contract fires `onError`/`onSettled` on cancellation (`lib/resource.ts`).

Its gaps are the predictable ones: ecosystem size and adoption maturity (TanStack Query, SWR, and RTK Query each have orders of magnitude more users and integration guides), DevTools (TanStack Query ships dedicated React/Vue/Solid DevTools; HellaJS has none), SSR dehydration for streaming/hydration (HellaJS has `resourceCache.prefetch` for warming the cache outside a resource, but no `dehydrate`/`hydrate` equivalent to serialize prefetched state across the server/client boundary the way TanStack Query and Solid's `ssrLoadFrom`/`storage` do), structural sharing defaults (TanStack ships it on by default; HellaJS ships it opt-in, so consumers who forget to set `structuralSharing: true` lose referential stability), framework hooks (no `useQuery`/`useSWR`-style integrations — you write your own adapter), and the absence of an OpenAPI/GraphQL codegen story comparable to RTK Query's.
