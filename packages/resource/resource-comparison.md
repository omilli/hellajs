# HellaJS @hellajs/resource vs. TanStack Query / SWR / RTK Query / Solid createResource / VueUse useFetch

A ground-up comparison based on the actual source code of `@hellajs/resource` v2. Every claim below was verified against `packages/resource/lib/`. Competitor versions researched: TanStack Query 5.102 (v5 guides), SWR 2.5.1 (source), RTK Query in Redux Toolkit 2.12.0 (docs), Solid 1.9.15 (source), VueUse 14.4.0 (source).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS resource | TanStack Query | SWR | RTK Query | Solid `createResource` | VueUse `useFetch` |
|---|---|---|---|---|---|---|
| Reactive model | Signals (`@hellajs/core`) | Framework observers (React/Vue/Svelte/Solid adapters) | React hooks over a global store | Redux store + observers | Solid signals | Vue refs |
| Caching model | Fetcher-scoped nested Map + global LRU | Single QueryCache keyed by `queryKey` | Single cache keyed by SWR key | Redux slice keyed by endpoint+arg | None (optional `storage` signal factory) | None |
| Deduplication | `WeakMap<fetcher, Map<key, OngoingRequest>>` sharing promise + AbortController | One query instance per key, shared by observers | 2 s `dedupingInterval` time window | Reference counting per `queryCacheKey` | None | None |
| Stale-while-revalidate | `staleTime` + background refetch | `staleTime` + `gcTime` + refetchOn* (defaults on) | `revalidateIfStale` + revalidateOn* (defaults on) | `refetchOnMountOrArgChange`, focus/reconnect via `setupListeners` | None | None |
| Mutations | `mutate()` with `onMutate`/`onSettled` rollback context | `useMutation` with full lifecycle + `invalidateQueries` | `useSWRMutation` → `trigger` with `optimisticData`/`rollbackOnError` | `build.mutation()` endpoints + `invalidatesTags` | `mutate` setter (no hooks) | None |
| Retry & polling | `retry`/`retryDelay` + `refetchInterval` (dynamic, visibility-aware) | `retry` 3 with backoff (default) + `refetchInterval` | `shouldRetryOnError` + uncapped backoff retry + `refreshInterval` | `retry` wrapper (5 attempts, opt-in) + `pollingInterval` | None | None |
| Framework coupling | None — reactive object, consume anywhere | Adapter per framework | React-only | Redux + React-Redux | Solid-only | Vue-only |
| Runtime deps | 0 + `@hellajs/core` peer | 0 (adapter bundles `query-core` + framework peer) | 2 (`dequal`, `use-sync-external-store`) | RTK's full dep tree (immer, redux, reselect, redux-thunk) | 3 (`csstype`, `seroval`, `seroval-plugins`) | 3 (`@vueuse/*`) |
| API shape | Factory returning reactive getters + control methods | `useQuery({ queryKey, queryFn, ... })` hook | `useSWR(key, fetcher, options)` hook | `createApi({ endpoints })` → generated hooks | `[resource, { mutate, refetch }] = createResource(source, fetcher, options)` | `const { data, error, ... } = useFetch(url, options)` |

HellaJS sits between Solid's `createResource` (closest architectural sibling — signal-based, factory function) and the React-centric libraries (TanStack Query, SWR, RTK Query). It is the only one here that combines a signal-based reactivity model with no framework coupling, a fetcher-scoped cache that isolates resources by fetcher identity, and the SWR/retry/polling/mutation feature set associated with the full-size libraries.

---

## 2. Architecture & Caching

### HellaJS

A resource is a self-contained reactive object — a handful of signals for state plus an async `run()` pipeline — reading from and writing into a module-level cache it does not own. The cache mechanics:

- The cache is a **nested `Map<scope, Map<key, CacheEntry>>`** in a single module-level `cacheMap` (`lib/cache.ts`). Each resource's cache scope is keyed by the fetcher function reference, so resources with different fetchers never collide even when they produce identical key values; resources that share the same fetcher function share a scope, which is what makes the transform pattern work — multiple resources deriving different views from one cached payload (`lib/cache.ts`).
- Each entry stores `data`, `timestamp`, `cacheTime` (TTL), `staleTime` (freshness), and `lastAccess` (LRU) (`lib/types/cache.d.ts`).
- The public `resourceCache.map` is a `CacheMapView` that flattens the nested structure into a read-only `get`/`has`/`size`/`clear` interface searching across all scopes (`lib/cache.ts`). Manual `resourceCache.set()` writes go to a separate `PUBLIC_SCOPE` symbol, so a manual entry and a resource entry with the same key coexist as two entries (`lib/cache.ts`).
- The cache survives resource disposal: individual resources read from and write to the global cache, but the cache itself is keyed by fetcher identity and lives independently of any resource instance (`lib/cache.ts`). Note that `cacheMap` is a strong `Map` — fetchers passed to `resource()` are retained while any of their entries are live; once every entry in a scope has expired, the throttled cleanup pass deletes the emptied scope and releases the fetcher (`lib/cache.ts`).

### TanStack Query

One global `QueryCache` keyed by serializable `queryKey` (arrays/objects). A query carries `state.data`, `state.status`, `state.fetchStatus`, and observers that subscribe components; the key is used "internally for refetching, caching, and sharing your queries throughout your application" (per the v5 Queries guide). There is no fetcher-scoped isolation — key identity is the only boundary. Cache lifetime is governed by `gcTime` (default 5 minutes after a query goes inactive) and results are structurally shared by default to stabilize data references (per the v5 Important Defaults guide).

### SWR

A single cache keyed by the SWR `key` (string, function, or array), backed by `new Map()` by default and customizable through the `provider` option (source verified at v2.5.1, `src/_internal/utils/config.ts`). Keys and fetchers are passed separately to `useSWR(key, fetcher)`, so cache identity is purely key-based — no fetcher scoping. A `dequal` deep-compare (`compare`) prevents re-renders when fetched data is deep-equal (source, `src/_internal/utils/config.ts`).

### RTK Query

One API slice equals one Redux slice. Endpoints are declared up front in `createApi`, and cache entries are keyed by a serialized `queryCacheKey` (endpoint name + serialized arguments). Requests producing the same `queryCacheKey` are de-duped against each other and share data and updates (per the RTK Query cache-behavior docs, researched at Redux Toolkit 2.12.0). Cache lifetime is subscription-driven: entries are reference-counted, and once the count reaches zero the data is removed after `keepUnusedDataFor` seconds (default 60).

### Solid `createResource`

No built-in cache. `createResource` tracks state per resource instance (`"unresolved" | "pending" | "ready" | "refreshing" | "errored"`) with a single in-flight promise per resource, exposes `state`, `loading`, `latest`, `error` as properties on the resource accessor, and returns `{ refetch, mutate }` as the actions (source verified in `packages/solid/src/reactive/signal.ts` at the solid-js main branch, 1.9.x line). An optional `storage` option lets users supply a custom signal factory, but deduplication or sharing across resources requires manual coordination; the only built-in cross-resource coordination is Suspense boundaries.

### VueUse `useFetch`

No cache and no deduplication. `useFetch` is a reactive wrapper around `window.fetch`: each call issues its own request and tracks local `data`/`error`/`isFetching`/`statusCode` refs (per the VueUse useFetch docs and source, v14.4.0). It is the Fetch API made reactive, nothing more.

**Verdict:** HellaJS's fetcher-scoped nested cache is unique in this group — every competitor either uses a single global key-namespaced cache (TanStack/SWR/RTK Query) or skips caching entirely (Solid/VueUse). The fetcher-keyed design means two resources pointing at the "same" key with different fetchers isolate automatically, and resources that share a fetcher share cache for transforms. The cost is a less obvious mental model: keys are not globally unique identifiers, they are namespaced by fetcher identity — and each `resource("url")` call builds a fresh fetcher closure, so two URL resources with the same URL get separate cache and dedup scopes (`lib/resource.ts`).

---

## 3. Dependencies

| | HellaJS (resource) | TanStack Query (react-query) | SWR | RTK Query (in RTK) | Solid | VueUse |
|---|---|---|---|---|---|---|
| Runtime deps | 0 | 1 (`@tanstack/query-core`) | 2 (`dequal`, `use-sync-external-store`) | 5 (immer, redux, reselect, redux-thunk, `@standard-schema/*`) | 3 (`csstype`, `seroval`, `seroval-plugins`) | 3 (`@vueuse/shared`, `@vueuse/metadata`, `@types/web-bluetooth`) |
| Peer deps | 1 (`@hellajs/core`) | 1 (`react`) | 1 (`react`) | 2 (`react`, `react-redux`) | 0 | 1 (`vue`) |

- `@hellajs/resource` declares zero runtime dependencies and one peer dependency, `@hellajs/core` (`package.json`). The package publishes a pre-bundled `dist/bundle.js` plus per-module builds (`resource.js`, `cache.js`, `internal/*`) reachable through its `exports` map, so consumers can tree-shake rather than take the bundle (`package.json`).
- `@tanstack/query-core` itself has zero dependencies; each adapter (`@tanstack/react-query`, `@tanstack/solid-query`, `@tanstack/vue-query`, …) pins the core and adds the framework as a peer (npm metadata at 5.102.7). Solid users can therefore use TanStack Query without React — but always through a per-framework adapter package.
- RTK Query ships inside `@reduxjs/toolkit`, whose dependency tree includes Immer and Redux (npm metadata at 2.12.0) — the realistic floor is the whole RTK stack, not an incremental add-on.
- HellaJS is the only entry that treats reactivity as a peer concern: bring `@hellajs/core` signals, or wire the reactive getters into any other framework's rendering layer manually.

---

## 4. Caching Model

HellaJS exposes cache configuration as a global singleton: `resourceCache.setConfig({ maxSize, enableLRU })` with defaults `maxSize: 1000` and `enableLRU: true` (`lib/cache.ts`).

| Mechanism | HellaJS | TanStack Query | SWR | RTK Query | Solid | VueUse |
|---|---|---|---|---|---|---|
| Scope | Per fetcher (`lib/cache.ts`) | Global by key | Global by key | Per endpoint+args | User-supplied | None |
| TTL | `cacheTime` per entry, `0` disables (`lib/cache.ts`) | `gcTime` after going inactive (default 5 min) | No entry TTL | `keepUnusedDataFor` (default 60 s) | None | None |
| Freshness | `staleTime` per entry (`lib/cache.ts`) | `staleTime` per query | `revalidateIfStale` | Implicit | None | None |
| Eviction | Global LRU, lazy on write (`lib/cache.ts`) | Inactive GC | None (time-based only) | Reference-count GC | None | None |
| Batch ops | `updateMultiple`, `invalidateMultiple`, `invalidateByPrefix`, `invalidateByPattern`, `invalidateAll` (`lib/cache.ts`) | `invalidateQueries({ predicate })`, `removeQueries` | None built-in | `invalidateTags`, `resetApiState` | None | None |
| Cleanup | Throttled 60 s interval, 100 entries per pass (`lib/cache.ts`) | Per-query GC timers | Time-based | RTK middleware | None | None |

The LRU implementation is brute-force: on every write that pushes the total over `maxSize`, all entries across all scopes are flattened into an array, sorted by `lastAccess` ascending, and the oldest are deleted (`lib/cache.ts`). The package AGENTS.md is candid about this — an `O(n log n)` full sort per eviction is fine at the default `maxSize: 1000`, but a workload with thousands of entries and high churn pays it on every overflow. `getCacheData` refreshes `lastAccess` on read, making the policy a true LRU rather than FIFO (`lib/cache.ts`); `resourceCache.map.get` and `resourceCache.get` are different code paths — only the latter refreshes `lastAccess` (`lib/cache.ts`).

The default is **no caching**: `cacheTime: 0` makes `setCacheData` a no-op, so every non-force `fetch()` falls through to dedup/network (`lib/cache.ts`, `lib/resource.ts`). TanStack Query inverts this — data lands in the cache by default and is garbage-collected after five inactive minutes (per the v5 Important Defaults guide). RTK Query caches by default too, gated by subscription counts (per its cache-behavior docs). HellaJS requires an explicit opt-in, which pairs with its no-auto-fetch default (`refetchOnKeyChange: false`, `lib/resource.ts`).

---

## 5. Request Deduplication

HellaJS's dedup is structurally distinct. The `OngoingRequest` shape stores `{ promise, abortController }` (`lib/internal/dedupe.ts`) in a `WeakMap<object, Map<unknown, OngoingRequest>>` keyed by fetcher reference, then cache key (`lib/internal/dedupe.ts`). When a second resource issues the same fetcher + key:

1. It looks up the in-flight request (`lib/resource.ts`).
2. It switches its own `currentAbortController` to the shared one (`lib/resource.ts`).
3. It awaits the shared promise and applies `handleSuccess` or `handleSuccessError` to the outcome (`lib/resource.ts`).

Because joiners adopt the shared controller, an abort on one joined resource aborts the shared request and resets every joiner to its `initialData` (`lib/resource.ts`, verified in `tests/deduplication.test.ts`). The `WeakMap` keyed by fetcher means entries are reclaimed automatically when a fetcher is garbage-collected (`lib/internal/dedupe.ts`).

`fetch({ force: true })` bypasses the cache and dedup *lookups* but registers its own in-flight promise via `setOngoing`, so later non-force fetches join a force request while it runs (`lib/resource.ts`); the SWR background refetch is exactly such a force call (`lib/resource.ts`). The same sharing also backs `resourceCache.prefetch`, which joins or registers an in-flight request for its fetcher+key (`lib/cache.ts`).

| Library | Dedup strategy |
|---|---|
| HellaJS | `WeakMap<fetcher, Map<key, OngoingRequest>>`, shared promise + shared AbortController (`lib/internal/dedupe.ts`, `lib/resource.ts`) |
| TanStack Query | One query instance per key; concurrent observers share the single fetch |
| SWR | `dedupingInterval` (default 2 s) — requests inside the window share, outside it they do not (source, v2.5.1) |
| RTK Query | Reference counting per `queryCacheKey`; the first subscriber triggers the fetch, others join (cache-behavior docs) |
| Solid `createResource` | None — each resource owns its request |
| VueUse `useFetch` | None — every call issues a new request |

HellaJS is the only library that keys deduplication by **fetcher identity** rather than by key alone. The advantage: two different fetchers that happen to produce the same key value isolate automatically. The disadvantage: an inline arrow function passed as a fetcher defeats both dedup and cache — a fresh closure per call is a fresh scope — so sharing requires a named, stable fetcher reference (`lib/resource.ts`, `lib/cache.ts`).

---

## 6. Abort & Cancellation

HellaJS races each request against an abort-reject promise: `raceAbort` registers a one-shot listener on the internal `AbortController`'s signal and rejects with a `DOMException` named `"AbortError"` (`lib/internal/abort.ts`). Three abort sources compose onto the same internal controller through `wireRequestControls`, which returns a `release()` that clears the timer and detaches the external listener on every settle path (`lib/internal/abort.ts`):

- **External `abortSignal`** — an already-aborted external signal aborts the internal controller synchronously before any fetch starts; otherwise a one-shot listener forwards the abort (`lib/internal/abort.ts`).
- **`timeout`** — a `setTimeout` calls `abort()` after the configured ms; the timer is cleared when the abort event fires, and the wiring is released when the request settles (`lib/internal/abort.ts`).
- **`abort()` method** — aborts the current controller and resets data to `initialData` (`lib/resource.ts`).

A deliberate design choice: **AbortError never sets `error()`**. The `handleSuccessError` helper checks `isAbortError` and clears `isLoading`/`isFetching` without touching the error signal, so status falls back to its data-derived value (typically `idle`) (`lib/resource.ts`, `lib/internal/errors.ts`). The docs tell consumers to check `isIdle() && !isFetching()` rather than `error()` after an abort/timeout (`docs/api/resource.mdx`). A late fetcher resolution after `abort()` is ignored as well — the success path checks the captured signal before `handleSuccess` (`lib/resource.ts`).

Retry delays are abort-aware: the delay promise registers an abort listener that clears the timer and resolves early, and the retry loop checks the signal at the top of each iteration (`lib/internal/retry.ts`). Long exponential backoffs can be interrupted mid-wait.

| Library | Abort mechanism |
|---|---|
| HellaJS | Per-request internal `AbortController`; external signal + timeout compose; `Promise.race`; abort sets no error state (`lib/internal/abort.ts`, `lib/resource.ts`) |
| TanStack Query | `AbortSignal` passed into `queryFn({ signal })`; consuming it and cancelling reverts query state to its previous value, with `CancelledError` propagating to observers unless `silent: true` (per the v5 Query Cancellation guide) |
| SWR | No `AbortSignal` plumbing to the fetcher; superseded requests are discarded (`onDiscarded` event) rather than cancelled (source, v2.5.1) |
| RTK Query | `signal` and `abort()` provided to every `baseQuery` call via its `api` argument (per the fetchBaseQuery docs) |
| Solid `createResource` | None built-in; the fetcher signature is `(source, { value, refetching })` — no signal (source, 1.9.x) |
| VueUse `useFetch` | `abort()`/`canAbort`/`aborted` plus a `timeout` option (source, v14.4.0) |

HellaJS and VueUse are the only two with a built-in request `timeout` option; TanStack, SWR, and RTK expect the consumer to thread a signal or a timeout into the fetch function itself.

---

## 7. Mutations & Optimistic Updates

HellaJS mutations live on the resource itself — `resource.mutate(variables)` — rather than in a separate hook. The mutation path bypasses cache and dedup entirely: results are never written to the cache (`lib/resource.ts`).

1. `onMutate(variables)` runs first and may return a context object — the rollback snapshot (`lib/resource.ts`).
2. The fetcher runs through the same `fetchWithRetry` loop used by reads — same abort race, same `retry`/`retryDelay` support (`lib/internal/retry.ts`).
3. On success: `handleSuccess` writes data and fires `onSuccess`, then `onSettled(result, undefined, variables, context)` fires (`lib/resource.ts`).
4. On failure: `onSettled(undefined, err, variables, context)` fires with the context, enabling rollback (`lib/resource.ts`).

Concurrent mutations run independently — each call owns its abort controller and its `onMutate` rollback context and settles individually, matching TanStack's concurrency model (server-side idempotency is the application's concern; guard double-submits with `isFetching()`). Reads and mutations never abort each other; `abort()` cancels the active read and every live mutation (`lib/resource.ts`).

A subtle behavior the test suite pins down: **`onSettled` is not called when a mutation is aborted** — even if `onMutate` already ran and produced a rollback context (`lib/resource.ts`, `tests/mutations.test.ts`). Abort is a cancellation, not a failure; anything staged in `onMutate` is the caller's responsibility to undo.

On success, the optional `invalidates: Array<string | RegExp>` option drives cross-scope cache invalidation: strings dispatch to `resourceCache.invalidateByPrefix`, RegExps to `invalidateByPattern` (`lib/resource.ts`). This deletes cache entries only — a resource currently displaying a matched key keeps its data; only the next fetch for that key goes to the network (`lib/resource.ts`, `tests/invalidates.test.ts`). No invalidation runs on error or abort. The documented read/write pattern uses two resources: one fetcher for reads, one for writes, with `onMutate` pushing into the read resource via `setData` (`docs/concepts/resources.mdx`).

| Library | Mutation API |
|---|---|
| HellaJS | `resource.mutate(vars)` with `onMutate`/`onSuccess`/`onError`/`onSettled` + `invalidates` (prefix/regex); same resource shape as reads; concurrent mutations run independently (`lib/resource.ts`) |
| TanStack Query | `useMutation({ mutationFn, onMutate, onSuccess, onError, onSettled })` + `mutate(variables, callbacks)`; rollback via `setQueryData` in `onError` (per the v5 Mutations guide) |
| SWR | `useSWRMutation(key, fetcher, options)` → `trigger(variables)` with `optimisticData`, `rollbackOnError`, `populateCache`, `revalidate` (source, v2.5.1) |
| RTK Query | `build.mutation()` endpoints → generated hooks; `invalidatesTags` auto-refetches active subscriptions (per the automated-refetching docs) |
| Solid `createResource` | `mutate` is the underlying signal's setter — no lifecycle hooks, no rollback context (source, 1.9.x) |
| VueUse `useFetch` | None — reads only; writes go through separate `fetch` calls |

HellaJS's mutation API is closest to TanStack Query's `useMutation` in lifecycle shape, but it has no tag system. RTK Query's `providesTags`/`invalidatesTags` refetch mounted queries automatically when a mutation lands; HellaJS's `invalidates` only deletes cache entries, and refreshing mounted resources is explicit — call `otherResource.invalidate()` from `onSettled`, or batch it with `resourceCache.invalidateResources` (`lib/cache.ts`).

---

## 8. Stale-While-Revalidate

HellaJS separates two time windows: `cacheTime` (TTL — how long the entry lives) and `staleTime` (freshness — how long before a background refetch triggers). On a cache hit:

1. The TTL check passes and the cached value is pushed to `rawData` synchronously, with no promise allocation (`lib/resource.ts`).
2. If `staleTime` is configured, `isStale(entry)` is true, and `revalidateOnStale` is true, a background `run(true)` fires un-awaited while `isFetching` becomes true and `isLoading` stays false (`lib/resource.ts`).

Defaults: `cacheTime: 0` (no caching) and `staleTime: Infinity` for resources (`lib/resource.ts`). Data is served stale-then-revalidated only when both are opted into. Manual `resourceCache.set()` writes default `staleTime` to `0` instead — always stale — so manual entries behave differently from resource-driven ones (`lib/cache.ts`).

The dual-flag design is what enables the `isLoading` vs `isFetching` distinction: `isLoading` is true only when there is no data at all; `isFetching` is true for any network activity including background refetches (`lib/resource.ts`). SWR names the same split `isLoading` vs `isValidating`; TanStack splits `status` (`pending`/`error`/`success`) from `fetchStatus` (`fetching`/`paused`/`idle`) (per the v5 Queries guide).

| Library | SWR implementation |
|---|---|
| HellaJS | Per-entry `staleTime`/`cacheTime`, background refetch on stale cache hit (`lib/resource.ts`) |
| TanStack Query | `staleTime` (default 0) + refetch on mount/focus/reconnect; structural sharing keeps references stable across refetches (per the v5 Important Defaults guide) |
| SWR | Core feature — `revalidateIfStale` (default true), `revalidateOnFocus`/`revalidateOnReconnect` (default true), `keepPreviousData`, `focusThrottleInterval` 5 s (source, v2.5.1) |
| RTK Query | `refetchOnMountOrArgChange`, `refetchOnFocus`/`refetchOnReconnect` enabled via `setupListeners` (per its docs) |
| Solid `createResource` | None — the fetcher re-runs on source change only |
| VueUse `useFetch` | None — one request per call |

The defaults are the philosophical divide: TanStack and SWR revalidate aggressively out of the box (data considered stale immediately; focus and reconnect trigger refetches by default), while HellaJS ships everything off — no caching, no staleness, no focus or reconnect refetch — and each behavior is an explicit opt-in (`lib/resource.ts`).

---

## 9. Retry & Polling

HellaJS normalizes retry configuration into `{ maxRetries, shouldRetry, getDelay }`: `retry` accepts a number, a boolean (`true` = retry once), or a predicate receiving the failure count (starting at 1 on the first failure) and the categorized `ResourceError`; `retryDelay` accepts a fixed ms or a function of attempt and error (`lib/internal/retry.ts`, `lib/types/resource.d.ts`). The shared `fetchWithRetry` loop is consumed by `run`, `mutate`, and `prefetch` — mutations retry with the same abort-interruptible delays as reads (`lib/internal/retry.ts`, `lib/resource.ts`, `lib/cache.ts`):

```typescript
// Exponential backoff with conditional retry
retry: (count, err) => err.category !== "not_found" && count < 3,
retryDelay: (n) => Math.min(1000 * 2 ** (n - 1), 30000),
```

Defaults: `retry: 0` and `retryDelay: 1000` ms (`lib/resource.ts`). No retries happen unless configured — the inverse of TanStack Query, which retries failed queries three times with exponential backoff before surfacing the error (per the v5 Important Defaults guide), and of SWR, which retries indefinitely by default (`shouldRetryOnError: true` with no `errorRetryCount` cap; backoff with jitter over an `errorRetryInterval` of 5 s) (source, v2.5.1). RTK Query's `retry` wrapper defaults to 5 attempts with exponential backoff but is an opt-in wrapper around `baseQuery` (per its customizing-queries docs).

Polling is a recursive `setTimeout` chain so each tick recomputes a dynamic interval from the latest data through `untracked(data)` — the interval can be a number, `false` to stop, or a function of the current data (`lib/internal/polling.ts`). Ticks are skipped when `document.visibilityState === "hidden"` unless `refetchIntervalInBackground` is set (`lib/internal/polling.ts`).

A non-obvious constraint: **polling requires `refetchOnKeyChange: true` to start at all** (`lib/resource.ts`). It arms once — at creation when `enabled` is truthy, otherwise on the first truthy `enabled` evaluation inside the key-change effect — and never re-arms after `abort()`/`reset()` until the resource is recreated (`lib/resource.ts`, `tests/polling.test.ts`). Focus and reconnect listeners have their own, weaker gates: `refetchOnWindowFocus` and `refetchOnReconnect` set up their listeners independently of auto-fetch (`lib/resource.ts`, `tests/focus.test.ts`). Focus listens on both `visibilitychange` (becoming visible) and the window `focus` event — switching between OS windows refetches without hiding the tab, and a back-to-back tab return (both events) is collapsed into one call by dedup (`lib/internal/lifecycle.ts`); reconnect rides `resourceCache.onOnlineChange`, backed by global `online`/`offline` window listeners registered once at module load (`lib/cache.ts`, `lib/internal/lifecycle.ts`).

| Library | Retry | Polling |
|---|---|---|
| HellaJS | Count/boolean/predicate + delay function, abort-interruptible delays (`lib/internal/retry.ts`) | `refetchInterval` number/fn + visibility-aware + `refetchIntervalInBackground` (`lib/internal/polling.ts`) |
| TanStack Query | 3 retries + exponential backoff (default), configurable per query | `refetchInterval` + `refetchIntervalInBackground` |
| SWR | `shouldRetryOnError` (default true) + uncapped count, jittered backoff (source, v2.5.1) | `refreshInterval` + `refreshWhenHidden` + `refreshWhenOffline` |
| RTK Query | `retry` wrapper, 5 attempts, opt-in (docs) | `pollingInterval` + `skipPollingIfUnfocused` (hooks docs) |
| Solid `createResource` | None | None |
| VueUse `useFetch` | None | None |

---

## 10. Built-in Features Matrix

| Feature | HellaJS | TanStack Query | SWR | RTK Query | Solid `createResource` | VueUse `useFetch` |
|---|---|---|---|---|---|---|
| Cache TTL (`cacheTime`/`gcTime`) | Per-entry (`lib/cache.ts`) | Per-query, default 5 min | None | Per-endpoint, default 60 s | None | None |
| Stale time (`staleTime`) | Per-entry (`lib/cache.ts`) | Per-query, default 0 | `revalidateIfStale` | Implicit | None | None |
| LRU eviction | Global, `maxSize` configurable (`lib/cache.ts`) | Inactive GC | None | Ref-count GC | None | None |
| Fetcher-scoped cache | `Map<fetcher, …>` (`lib/cache.ts`) | No | No | No | No | No |
| Request deduplication | `WeakMap<fetcher, Map<key, …>>` (`lib/internal/dedupe.ts`) | Per-query instance | Time-windowed (2 s) | Per-`queryCacheKey` | None | None |
| Shared `AbortController` for dedup'd requests | Yes (`lib/resource.ts`) | Per-query signal | Per-request | Per-query signal | None | None |
| External `AbortSignal` composition | Yes (`lib/internal/abort.ts`) | Yes (`queryFn` signal) | No fetcher signal | Yes (`baseQuery` signal) | Manual | Manual |
| Request timeout | Built-in (`lib/internal/abort.ts`) | Via signal in fetcher | Via signal in fetcher | Via signal in fetcher | Manual | Built-in |
| Retry with predicate + custom delay | Yes (`lib/internal/retry.ts`) | Yes | Predicate-free (count/interval) | Wrapper (count/backoff) | None | None |
| Stale-while-revalidate | Yes (`lib/resource.ts`) | Yes | Yes (core feature) | Partial | None | None |
| Polling (fixed + dynamic) | Yes (`lib/internal/polling.ts`) | Yes | Yes | Yes | None | None |
| Refetch on focus / reconnect | Yes (`lib/internal/lifecycle.ts`) | Yes (defaults on) | Yes (defaults on) | Yes (via `setupListeners`) | None | None |
| Mutations with rollback context | Yes (`lib/resource.ts`) | Yes | Yes (`optimisticData`) | Via `onQueryStarted` | No | No |
| Data transformation (cache raw, read transformed) | Yes, via `computed` (`lib/resource.ts`) | `select` option | No | `transformResponse` | Manual | `afterFetch` interceptor |
| Structural sharing (referential stability) | Opt-in `structuralSharing` (`lib/internal/structural.ts`) | Default on | Deep-compare re-render skip (`dequal`) | No | No | No |
| Prefetch without a resource | `resourceCache.prefetch(...)` (`lib/cache.ts`) | `queryClient.fetchQuery`/`prefetchQuery` | `preload` | `initiate` | None | None |
| Batch invalidation (prefix/pattern/predicate) | Yes (`lib/cache.ts`) | `invalidateQueries({ predicate })` | No | `invalidateTags` | No | No |
| Structured error category | Yes — `not_found`/`server`/`client`/`abort`/`unknown` (`lib/internal/errors.ts`) | Error instance | Error instance | Error instance | Error instance | Error/statusCode refs |
| SSR dehydration / hydration | No — resources no-op on the server (`lib/resource.ts`) | `dehydrate`/`hydrate` + `HydrationBoundary` | `fallback` data | `extractRehydrationInfo` rehydration | `ssrLoadFrom`/`storage` options | None |
| Framework-agnostic reactive object | Yes | No (adapters) | React-only | Redux-bound | Solid-only | Vue-only |

### Notable HellaJS differentiators

- **Fetcher-scoped cache isolation** — the nested `Map<fetcher, Map<key, …>>` gives resources with different fetchers isolated scopes even for identical keys, while resources sharing a fetcher share one scope (the transform pattern's requirement) (`lib/cache.ts`).
- **Dedup keyed by fetcher identity via `WeakMap`** — in-flight registrations are reclaimed when the fetcher is garbage-collected; joiners share both the promise and the `AbortController` (`lib/internal/dedupe.ts`, `lib/resource.ts`).
- **Public vs fetcher scope separation** — manual `resourceCache.set()` writes go to a `PUBLIC_SCOPE` symbol that never collides with resource-driven entries, even for the same key (`lib/cache.ts`).
- **Cache outlives resources** — entries are module-level and survive `dispose()`/recreation; only the resource tears down (`lib/cache.ts`, `lib/resource.ts`).
- **Transform via `computed`** — raw data is cached, `data()` returns a transformed view through a `@hellajs/core` computed, so transforms always read through to current raw data (`lib/resource.ts`).
- **Opt-in structural sharing** — `structuralSharing` reuses unchanged plain-object/array subtree references on fetch success; `Map`/`Set`/`Date`/class instances use strict equality and are never merged (`lib/internal/structural.ts`).
- **`onSettled` suppressed on mutation abort** — cancelled mutations skip the settled hook even if `onMutate` already ran, treating abort as cancellation, not failure (`lib/resource.ts`, `tests/mutations.test.ts`).
- **Pattern + prefix batch invalidation across all scopes** — `invalidateByPrefix` and `invalidateByPattern` sweep every fetcher scope in one call, string keys only (`lib/cache.ts`).
- **Reusable network-status subscription** — `resourceCache.onOnlineChange(cb)` exposes the online/offline callback set to non-resource code as well (`lib/cache.ts`).
- **Factory reset** — `resetResource()` clears cache, dedup registrations, online callbacks, and the cleanup throttle in one call for logout/HMR/testing (`lib/resetResource.ts`).

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
await user.fetch();               // cache-first; resolves the data (or undefined), never rejects
user.fetch({ force: true });     // bypass cache
user.invalidate();               // clear cache entry + refetch
user.setData(old => ({ ...old, lastSeen: Date.now() }));
user.abort();                    // cancel + reset to initialData
user.reset();                    // back to idle, reusable
user.dispose();                  // one-way teardown

// Mutation (separate writer resource, optimistic update against the reader)
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

The shape — a factory returning an object of reactive getters and control methods — is closer to Solid's `createResource` than to the TanStack/SWR/RTK Query hook APIs. The differences vs Solid: HellaJS returns a flat object (no `[resource, actions]` destructuring), `data` is a `computed` that applies `transform` when supplied (`lib/resource.ts`), and there is a real cache underneath. The differences vs TanStack Query: there is no `queryKey` array — the key is whatever the `key` option resolves to, scoped by fetcher; and `transform` is fixed at resource creation rather than selected per subscription (`lib/resource.ts`). The factory pattern means resources are plain objects passable anywhere — and also that there is no hooks layer: consuming one from React or Vue requires a small hand-written adapter.

---

## Bottom Line

Architecturally, HellaJS resource is the closest sibling to Solid's `createResource` — a signal-based factory returning reactive state — but with the feature set of TanStack Query layered on: cache, dedup, SWR, retry, polling, mutations, abort. It is the only library in this comparison that is simultaneously framework-agnostic at the reactivity layer, fetcher-scoped rather than globally key-namespaced at the cache layer, and dependency-light beyond its own core peer.

What sets HellaJS apart — and no single competitor matches all of:

1. **Fetcher-scoped cache** — `Map<fetcher, Map<key, …>>` isolates resources by fetcher identity, not by a global key string; TanStack/SWR/RTK Query all use global key namespaces, and Solid/VueUse do not cache at all (`lib/cache.ts`).
2. **Framework-agnostic reactive object** — the resource is a plain object of signal getters and methods, consumable anywhere `@hellajs/core` signals work; TanStack Query requires per-framework adapters, SWR is React-only, RTK Query requires Redux, and Solid/VueUse are framework-bound (`lib/resource.ts`).
3. **`WeakMap`-keyed dedup with shared `AbortController`** — concurrent identical requests share both the promise and the abort controller, and a `force: true` fetch registers itself so later non-force fetches join it in flight; no competitor composes abort through the dedup layer (`lib/internal/dedupe.ts`, `lib/resource.ts`).
4. **Public-scope vs fetcher-scope cache separation** — `resourceCache.set()` writes to a `PUBLIC_SCOPE` symbol that can never collide with resource-driven entries (`lib/cache.ts`).
5. **Default-off caching, retries, and refetch triggers** — `cacheTime: 0`, `retry: 0`, and every refetch flag off by default; TanStack Query and SWR ship aggressive defaults (immediate staleness, focus/reconnect refetch, automatic retries). Opting in is one option per behavior, at the cost of no free caching on first use (`lib/resource.ts`).
6. **Structured error categories** — fetch errors carry a `category` (`not_found`/`server`/`client`/`abort`/`unknown`) parsed from the error message, enabling retry predicates keyed on status class without re-parsing (`lib/internal/errors.ts`).
7. **Cross-scope prefix/pattern invalidation** — `invalidateByPrefix`/`invalidateByPattern` sweep every fetcher scope in one call (`lib/cache.ts`); TanStack Query offers `predicate` filters over a single namespace, RTK Query offers tags, SWR/Solid/VueUse offer nothing equivalent.

Its gaps are the predictable ones: ecosystem size and adoption maturity (TanStack Query, SWR, and RTK Query each have orders of magnitude more users, integrations, and answered questions), DevTools (TanStack Query ships dedicated devtools; HellaJS has none), SSR dehydration (TanStack Query's `dehydrate`/`hydrate` and Solid's `ssrLoadFrom`/`storage` move server-fetched state to the client; HellaJS resources no-op on the server, so server data must be passed as `initialData` and prefetched manually via `resourceCache.prefetch`), structural sharing defaults (TanStack Query stabilizes references out of the box; HellaJS requires `structuralSharing: true` per resource), framework hooks (no `useQuery`/`useSWR`-style integrations — a hand-written adapter bridges into React or Vue), no Suspense integration (Solid and TanStack integrate natively; HellaJS exposes loading/error state only), and no OpenAPI/GraphQL codegen story comparable to RTK Query's endpoint generation.
