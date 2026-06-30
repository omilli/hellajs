<resource-package-instructions>
Reactive async data fetching over `@hellajs/core`. Cache-first pipeline with fetcher-scoped TTL/LRU cache, request deduplication, abort/timeout, retry, polling, focus/reconnect refetch, SWR, structural sharing, and promise-based mutations. Dependency: `@hellajs/core` (peer). Source truth is `lib/`; tests/docs serve it.

## File map

| Path | Responsibility |
|---|---|
| `lib/resource.ts` | `resource()` factory (URL + fetcher overloads), the `run()` fetch pipeline, abort/timeout/retry wiring, `mutate`, `setData`, `status`. The 512-line core. |
| `lib/cache.ts` | Module-level `cacheMap`, `PUBLIC_SCOPE`, `flatView`, the `resourceCache` singleton, online/offline window listeners (registered once at load). |
| `lib/index.ts` | Barrel: `export { resource, resourceCache, resetResource }` + type-only re-exports. |
| `lib/types/resource.d.ts` | `Resource`, `ResourceOptions`, `ResourceError`, `ResourceErrorCategory`, `Fetcher`, `ResourceStatus`, `FetchOptions`. |
| `lib/types/cache.d.ts` | `CacheEntry`, `CacheConfig`, `CacheUpdate`, `CacheMapView`, `ResourceCache`. |
| `lib/internal/core.ts` | Thin re-export from `@hellajs/core`: `signal/computed/effect/untracked/isFunction/isPlainObject/hasDocument/hasNavigator/hasWindow`. |
| `lib/internal/dedupe.ts` | `ongoingRequestsMap` (`WeakMap<object, Map<key, OngoingRequest>>`) + `getOngoing/setOngoing/deleteOngoing`. `OngoingRequest = { promise, abortController }`. |
| `lib/internal/retry.ts` | `resolveRetryConfig(retry, retryDelay)` → `{ maxRetries, shouldRetry, getDelay }`. Boolean→count, function→predicate. |
| `lib/internal/polling.ts` | `createPolling` — recursive `setTimeout`, visibility-aware, dynamic interval via `untracked(data)`. |
| `lib/internal/lifecycle.ts` | `createFocus` (visibilitychange→visible), `createReconnect` (`resourceCache.onOnlineChange`→online). |
| `lib/internal/structural.ts` | `structuralShare(prev, next)` — reference-preserving deep merge over arrays/plain objects. |
| `lib/internal/errors.ts` | `isAbortError` (DOMException+AbortError), `categorizeError` (regex `HTTP N:` → statusCode → category). |

## Architecture

### The fetch pipeline (`run(force, manual)`, resource.ts:161)

1. **Guard** — `if (!untracked(isEnabled) && !(manual && enabledIsFn)) return;`. Manual fetch bypasses `enabled` **only in getter form**; a static `enabled:false` blocks even manual fetch.
2. **Cache phase** (skipped when `force`) — only if `cacheTime > 0`: `cleanupExpiredCache()`, lookup entry; on TTL-valid hit → update `lastAccess`, push to `rawData`, `handleError()` (clears error/loading/fetching). Then **SWR**: if `staleTime !== undefined && isStale(entry) && revalidateOnStale` → `isFetching(true)` + un-awaited `run(true)` (force, re-enters dedup). Return.
3. **Dedup phase** (skipped when `force`) — if `deduplicate`, `getOngoing(fetcherFn, cacheKey)`; on hit → adopt shared `abortController` (`cleanAbort`), `handleError(undefined, !hasData, true)`, `await promise` (unless already aborted) → success/abort handler. Return.
4. **Request phase** — `currentAbortController = cleanAbort()`; wire external `abortSignal` (immediate-abort if already aborted); wire `timeout`; capture `currentSignal`; `handleError(undefined, !hasData, true)`; reset `retryCount`. Build deferred `requestPromise`; if `deduplicate`, `setOngoing(...)` + attach `.catch(()=>{})` to swallow unhandled rejection.
5. **Retry loop** — per-attempt: pre-abort check; `Promise.race([fetcherFn(cacheKey), abortReject])`. On success: optional `structuralShare`, `setCacheData(..., cacheTime, staleTime ?? Infinity)`, `handleSuccess`, resolve promise, `deleteOngoing`, return. On error: abort→handle+reject+return; else `retryCount++`, `shouldRetry` false→handle+reject+return; else await `getDelay` (abort clears timeout + resolves), post-delay abort check.

Key internal helpers: `handleError(err?, loading?, fetching?)` sets error/loading/fetching + `onError`; `handleSuccessError` clears loading/fetching for AbortError **without** setting error, else delegates to `handleError`; `handleSuccess` writes `rawData`, clears flags, fires `onSuccess`; `cleanAbort(controller?)` aborts the prior controller and returns `controller ?? new AbortController()`.

### Cache (`cacheMap`, cache.ts:12)

- `cacheMap = new Map<unknown, Map<unknown, CacheEntry>>()` — **strong Map**, outer key = fetcher function reference, inner key = cache key. Fetchers are retained for the cache's lifetime (agent: avoid unbounded unique-fetcher patterns).
- `PUBLIC_SCOPE = Symbol("public")` — target scope for `resourceCache.set()`.
- `setCacheData(scope, key, data, cacheTime=0, staleTime=0)`: **no-op if `cacheTime` is 0**; else sets `{data, timestamp, cacheTime, staleTime, lastAccess}` and runs global LRU eviction if over `maxSize`.
- `getCacheData`: TTL-valid check, deletes expired, refreshes `lastAccess` on hit.
- `updateCacheData`: returns `false` on miss/expired (deletes expired), `true` on success; mutates `entry.data` in place.
- `cleanupExpiredCache`: throttled to 60s (`lastCleanupTime` module var), 100-entry batch cap, deletes where `now - timestamp > cacheTime`.
- `isStale(entry)`: `staleTime === Infinity` → false; else `now - timestamp > staleTime`.

### Deduplication (`ongoingRequestsMap`, dedupe.ts:17)

- `WeakMap<object, Map<key, {promise, abortController}>>` — GCs with the fetcher. **No subscriber list**; joiners simply `await` the shared promise and share the shared `abortController`.
- `force` skips the *lookup* but `setOngoing` still registers the in-flight promise, so later non-force fetches join a force request while it runs.

### Abort / timeout / external signal

- One internal `AbortController` per request, stored as `currentAbortController`. External `abortSignal` and `timeout` both wire listeners onto it; already-aborted external signal aborts immediately.
- Fetcher is raced against a promise that rejects with `DOMException("...","AbortError")` on `currentSignal.addEventListener("abort", ...)`.
- AbortError path clears `isLoading`/`isFetching` and **does not** set `error()` (status stays derived, typically `idle`).

### Retry (retry.ts)

- `retry`: `number` = max attempts; `true`=1, `false`=0 (default); `(count, error)=>boolean` used directly as `shouldRetry`.
- `retryDelay`: fixed ms (default 1000) or `(attempt, error)=>number`. Delay is abort-interruptible (listener clears timeout, post-delay check exits the loop). `retryCount` resets per request; resets to 0 on success.

### Polling / focus / reconnect (polling.ts, lifecycle.ts)

- `createPolling`: recursive `setTimeout`; skips tick when `document.visibilityState === "hidden"` unless `refetchIntervalInBackground`; dynamic interval re-evaluated via `untracked(data)` after each tick. `false`/`0`/`undefined` disable.
- `createFocus`: `visibilitychange` → `run(false)` only when becoming visible.
- `createReconnect`: subscribes via `resourceCache.onOnlineChange` → `run(false)` on transition to online.
- **Setup gates differ**: `polling.setup()` requires `refetchOnKeyChange && isEnabled() && refetchInterval`; `focus.setup()` and `reconnect.setup()` require only their own boolean flags (work without auto-fetch). All three are cleared by `abort`/`reset`/`dispose`.

### LRU eviction (cache.ts:111)

Global, lazy, on every `setCacheData` that pushes `totalSize()` over `maxSize` (when `enableLRU`): flatten every entry across all scopes → sort by `lastAccess` ascending → delete the N oldest from their owning scope. O(n log n) full sort, no heap.

### Structural sharing (structural.ts)

Opt-in (`structuralSharing`, default false). On fetch-success only: returns `prev` when structurally equal, reusing unchanged plain-object/array subtree references so dependent computeds skip re-evaluation. Primitives use `Object.is`; `Map`/`Set`/`Date`/class instances use strict equality (never merged); key-set mismatch → fresh value. **Not** applied to `setData`/`mutate`.

### Transform

`transform: (data: T) => TTransformed`. `data` is a `computed` over `rawData` applying the transform (returns `undefined` when `rawData` is undefined). Cache stores raw `T`; `setData`/`mutate` operate on raw `T`. Multiple resources sharing the same fetcher + key share the raw cache entry while exposing different transforms.

## Data structures

### `Resource<TTransformed, T>`

| Member | Signature | Note |
|---|---|---|
| `data` | `() => TTransformed \| undefined` | Always a `computed` (even without transform). |
| `error` | `() => ResourceError \| undefined` | Never set on AbortError. |
| `isLoading` | `() => boolean` | True only when no data at all (initial load). |
| `isFetching` | `() => boolean` | True for any network activity (incl. background). |
| `isIdle` | `() => boolean` | `status() === "idle"`. |
| `status` | `() => ResourceStatus` | Reads `rawData()` (not `data()`); transform-invisible. |
| `fetch` | `(opts?: { force? }) => void` | Manual; `force` bypasses cache + dedup lookup. |
| `abort` | `() => void` | Aborts, resets data to `initialData`, clears flags/listeners. |
| `invalidate` | `() => void` | Deletes this fetcher's cache entry for the key, then `run(true)`. |
| `setData` | `(T \| ((old) => T)) => void` | Updates `rawData`; caches only if `cacheTime > 0`. |
| `cacheKey` | `() => unknown` | `untracked(resolveKey)`. |
| `mutate` | `<V>(vars) => Promise<T>` | Bypasses cache + dedup; result not cached. |
| `reset` | `() => void` | Like `abort` but also clears `mutationContext`; reusable. |
| `dispose` | `() => void` | One-way teardown of effects/timers/listeners; does **not** abort in-flight, does **not** clear cache. |

### `CacheEntry<T>`

| Field | Type | Purpose |
|---|---|---|
| `data` | `T` | Cached value. |
| `timestamp` | `number` | Creation time; drives TTL (`cacheTime`) and `staleTime`. |
| `cacheTime` | `number` | TTL in ms (`0` = uncached). |
| `staleTime` | `number` | Freshness in ms (`Infinity` = never stale). |
| `lastAccess` | `number` | Last read; drives LRU. |

### `CacheConfig`

| Field | Default | Purpose |
|---|---|---|
| `maxSize` | `1000` | Global entry cap across all scopes. |
| `enableLRU` | `true` | Toggle eviction. |

### `CacheMapView` (`resourceCache.map`)

| Member | Behavior |
|---|---|
| `size` | `totalSize()` across all scopes. |
| `get(key)` | First TTL-valid `CacheEntry` across scopes; **does not** refresh `lastAccess`. |
| `has(key)` | TTL-valid existence check across scopes. |
| `clear()` | `cacheMap.clear()`. |

## `ResourceOptions<T, K, TTransformed>`

| Option | Default | Note |
|---|---|---|
| `key` | `() => undefined` | `(() => K) \| K`. Function or static value. |
| `enabled` | `true` | `boolean \| () => boolean`. Getter re-evaluated reactively in the key-change effect. |
| `refetchOnKeyChange` | `false` | Gates auto-fetch, polling setup, and the reactive key-tracking effect. |
| `initialData` | `undefined` | Seeds `rawData`; status stays `idle` while `rawData === initialData`. |
| `cacheTime` | `0` | TTL ms. `0` disables caching entirely. |
| `staleTime` | `Infinity` (resource) | Freshness ms. `0` = always stale. (`resourceCache.set` defaults this to `0`.) |
| `revalidateOnStale` | `true` | Background refetch when stale. |
| `timeout` | `undefined` | Ms before internal abort. |
| `abortSignal` | `undefined` | External `AbortSignal` wired onto the internal controller. |
| `deduplicate` | `true` | Join in-flight same-fetcher+key requests. |
| `structuralSharing` | `false` | Preserve unchanged subtree references on fetch success. |
| `retry` | `0` | `number \| boolean \| (count, error) => boolean`. |
| `retryDelay` | `1000` | `number \| (attempt, error) => number`. |
| `transform` | `—` | `(data: T) => TTransformed`. |
| `onSuccess` / `onError` | `—` | `(data) => void` / `(err) => void`. |
| `refetchInterval` | `undefined` | `number \| false \| ((data?) => number \| false)`. |
| `refetchIntervalInBackground` | `false` | Keep polling when tab hidden. |
| `refetchOnWindowFocus` | `false` | Refetch on tab visible. |
| `refetchOnReconnect` | `false` | Refetch on network online. |
| `onMutate` | `—` | `(variables) => context`; runs before mutation, enables optimistic updates. |
| `onSettled` | `—` | `(data?, error?, variables?, context?) => ...`; **skipped on mutation abort**. |
| `invalidates` | `—` | `Array<string \| RegExp>`; on mutate success, strings → `resourceCache.invalidateByPrefix`, RegExp → `invalidateByPattern`. Deletes cache entries only (no mounted-resource refetch); no invalidation on error/abort. |

## Status machine

| Status | Condition (reads `rawData()`, not `data()`) |
|---|---|
| `idle` | `rawData === initialData`, or `rawData` undefined and no error/loading. |
| `loading` | `isLoading()` true (initial fetch, no data yet). |
| `success` | `rawData !== undefined && rawData !== initialData`. |
| `error` | `error()` set (never on abort). |

`abort()`/`reset()` → `idle` (data restored to `initialData`); `invalidate()` → cache delete + immediate refetch (stays `success` if data arrives).

## Public exports

| Export | Kind | Note |
|---|---|---|
| `resource` | function | `resource(url, options?)` or `resource(fetcher, options?)`. URL overload wraps a fresh `async (key) => fetch(key)` closure and uses the URL as `key`. |
| `resourceCache` | object | Global cache singleton (see `CacheMapView` + methods below). |
| `resetResource` | function | Factory-reset: clears `cacheMap`, `ongoingRequestsMap`, `onlineCallbacks`, and resets `lastCleanupTime` to `0`. Unlike `invalidateAll`, which only clears the cache map. |
| `types` | type-only | `Resource`, `ResourceOptions`, `ResourceError`, `ResourceErrorCategory`, `Fetcher`, `FetchOptions`, `ResourceStatus`; `CacheEntry`, `CacheConfig`, `CacheUpdate`, `CacheMapView`, `ResourceCache`, `PrefetchOptions`. |

### `resourceCache` methods

`set(key, data, cacheTime=0, staleTime=0)` → `key` (writes `PUBLIC_SCOPE`; validates non-negative numbers; no-op when `cacheTime=0`). `get<T>(key)` (searches all scopes, refreshes `lastAccess`, deletes expired). `update(key, updater)`/`updateMultiple(updates)` → `boolean`/void (first-scope hit wins; throws on `undefined` updater). `cleanup()`. `invalidate(key)`/`invalidateMultiple(keys)` (all scopes). `invalidateByPrefix(prefix)` / `invalidateByPattern(regex)` → count (**string keys only**). `invalidateAll()` → count. `invalidateResources([...])` (calls `.invalidate()` on each). `setConfig(partial)`. `prefetch<T,K>(opts) => Promise<T>` (fetches via `fetcher(key)`, caches under the fetcher's own scope without creating a resource; dedup/retry/abort like `resource()`). `isOnline()` / `onOnlineChange(cb) => unsub`.

## Non-obvious behaviors

**Fetch & cache**
- `fetch({force:true})` skips cache + dedup **lookup** but still calls `setOngoing`, so later non-force fetches join it while in flight. (resource.ts:245)
- SWR background call is `run(true)` (force): it skips the cache lookup but re-enters dedup. (resource.ts:179-184)
- With `cacheTime=0` (default), every non-force `fetch()` falls through to dedup/network — no cache phase runs. (resource.ts:168)
- `setData` always updates `rawData`; cache write is gated on `cacheTime > 0`. With an expired cache entry, `setData`'s `getCacheData` deletes the stale entry and the updater still sees `rawData()` as the old value, then re-creates the entry. (resource.ts:397, resource-cache.test.ts:239)
- `mutate` results are **not** cached and do not dedup; `handleSuccess` fires (and `onSuccess`) but `setCacheData` is never called. (resource.ts:420-452)
- Cache + dedup are keyed by **fetcher reference identity**. Each `resource("url")` call builds a fresh fetcher closure → two URL resources with the same URL get **separate** cache/dedup scopes. Share a named fetcher function to share scope (needed for transform-sharing). (resource.ts:50-58)
- `resourceCache.set()` targets `PUBLIC_SCOPE`; a manual entry and a resource entry with the same key coexist as two entries. (cache.ts:229, collision.test.ts:167)
- `resourceCache.map.get` does **not** refresh `lastAccess`; `resourceCache.get` does. They are different code paths. (cache.ts:183 vs 232)

**Abort & error**
- AbortError never sets `error()`; status falls back to data-derived (typically `idle`). Check `isIdle() && !isFetching()` rather than `error()` after abort/timeout. (resource.ts:119-126)
- `dispose()` does **not** abort in-flight requests and does **not** touch the cache; a resolving fetcher promise still updates `rawData` after dispose. It only clears polling/focus/reconnect + the key-change effect. One-way (resource is dead after). (resource.ts:489, fetching.test.ts:267)
- Dedup joiners adopt the shared `abortController`; aborting one joined resource aborts the shared controller and resets **all** joiners to their `initialData`. (resource.ts:200, deduplication.test.ts:110)
- `onSettled` is skipped on mutation abort — even if `onMutate` already ran and produced a context for rollback. (resource.ts:449-460, mutations.test.ts:135)
- External `abortSignal` already-aborted at call time → internal controller aborted synchronously before the fetcher runs. (resource.ts:218-221)
- `timeout` and external `abortSignal` compose: both attach listeners to the same internal controller. (resource.ts:218-227)
- Late fetcher resolution after `abort()` is ignored: success path checks `!currentSignal.aborted` before `handleSuccess`. (resource.ts:276, errors.test.ts:129)

**Lifecycle & reactivity**
- `data` is **always** a `computed` (with or without transform); reading `data()` inside an effect tracks `rawData`. (resource.ts:66-71)
- `status()` reads `rawData()` directly, so `transform` cannot change status. A fetch returning a value equal to `initialData` leaves status `idle`. (resource.ts:380-389)
- Manual `fetch()` bypasses `enabled` **only when `enabled` is a getter**; static `enabled:false` blocks manual fetch too (guard: `manual && enabledIsFn`). (resource.ts:161-162, retry.test.ts:153)
- Auto-fetch requires `refetchOnKeyChange:true`. With an explicit `key`, the effect skips fetches while the key resolves to `null`/`undefined`; with **no** explicit key (default `() => undefined`) it always fetches. (resource.ts:352-359, fetching.test.ts:236)
- `polling.setup()` is gated on `refetchOnKeyChange && isEnabled() && refetchInterval`; `focus`/`reconnect` setup are gated only on their own flags and work without auto-fetch. (resource.ts:363-375, focus.test.ts:119)
- `cacheMap` is a strong `Map` keyed by fetcher (fetchers retained for cache lifetime); `ongoingRequestsMap` is a `WeakMap<object,...>` (GCs with fetcher). (cache.ts:12, dedupe.ts:17)
- Cache entries are module-level and survive `dispose()`/resource recreation. (cache.ts:12)

**Cache invalidation**
- `invalidateByPrefix` / `invalidateByPattern` match **string keys only**; non-string keys are skipped silently. (cache.ts:300,326, batch-invalidation.test.ts:35)
- `update`/`updateCacheData` return `false` on miss or expired entry (and delete the expired entry in passing). (cache.ts:156-179)
- LRU eviction is **global** across all scopes; runs only when `totalSize()` exceeds `maxSize` after a `setCacheData`. (cache.ts:111-137, collision.test.ts:130)
- `cleanupExpiredCache` is throttled (60s) and capped (100 deletions/pass); invoked lazily from `setCacheData` and the cache-lookup phase of `run`. (cache.ts:65-95)
- `staleTime` default differs by entry point: resources pass `staleTime ?? Infinity` (never stale); `resourceCache.set` defaults `staleTime` to `0` (always stale). (resource.ts:275, cache.ts:224)
- `invalidateResources` calls `.invalidate()` on each member synchronously (no batching/dedup of the resulting refetches). (cache.ts:345)

## Performance & memory

- **Early cache return**: two-level `Map` lookup, no promise allocation on hit. (resource.ts:170)
- **Dedup**: shared promise + shared controller eliminate thundering-herd fetches.
- **Lazy LRU**: full sort only on `maxSize` overflow; acceptable for configured limits.
- **Throttled cleanup**: 60s + 100-entry batch.
- **Signal capture**: `currentSignal` captured before async work avoids repeated `aborted` checks.
- **Computed transform**: applied per `data()` read; always consistent with `rawData`.
- **Manual loop unrolling** (`while (i < len)` + indexed access) across cache/dedupe/flatView hot paths.
- Memory: fetcher-scoped strong `cacheMap` retains fetchers; `WeakMap` dedup releases them. `dispose()` clears effects/timers/listeners but not the cache or in-flight promise.

## Testing

Follow `guides/tests.md` (rules) and `guides/code.md` (source). Tests import from `@hellajs/resource/bundle` (the built bundle, instrumented for coverage per `bunfig.toml`); coverage target is `dist/`. Shared fixtures live in `tests/helpers.ts` (`mockUser`, `mockPosts`). Reactive primitives (`signal`, `effect`, `computed`, `flush`) import from `@hellajs/core`. Test helpers (`delay`) import from `@utils/test-helpers.js`. Track call counts with `mock()` from `bun:test`. Time-sensitive cache/TTL tests mock `Date.now`. Run with `bun coverage resource`.
</resource-package-instructions>
