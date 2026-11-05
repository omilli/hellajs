# resource-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/resource, the reactive data fetching package: resource() over a URL or fetcher, fetcher-scoped LRU/TTL caching, request deduplication, SWR, abort and retry, polling, offline pausing, mutations with optimistic rollback, and the resourceCache singleton. Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. The resource primitive
  - 1.1 Set keepPreviousData false for per-key loading windows (`res-keep-previous-data`)
  - 1.2 Turn on refetchOnKeyChange for reactive keys (`res-reactive-key-fetch`)
  - 1.3 Read isLoading, isFetching, and status; aborts never set error (`res-read-state-flags`)
  - 1.4 Share one named fetcher to share cache and dedup scope (`res-share-fetcher-scope`)
  - 1.5 Build keys from primitives and plain objects (`res-structural-keys`)
  - 1.6 Keep transforms on the raw data plane (`res-transform-raw-data`)
- 2. Cache management
  - 2.1 Pick the right invalidation tool (`cache-choose-invalidation`)
  - 2.2 Configure the global LRU through setConfig (`cache-config-lru`)
  - 2.3 Opt into caching with cacheTime (`cache-opt-in-cachetime`)
  - 2.4 Pair staleTime with cacheTime for stale-while-revalidate (`cache-pair-staletime-swr`)
  - 2.5 Warm caches with prefetch and a shared fetcher reference (`cache-prefetch-warm`)
  - 2.6 resourceCache.set writes a separate public scope (`cache-public-scope`)
  - 2.7 Use resetResource for factory resets, invalidateAll for cache only (`cache-reset-vs-invalidateall`)
  - 2.8 Write cache updates through setData, update, and updateMultiple (`cache-write-through-updaters`)
- 3. Mutations
  - 3.1 Catch mutate calls; fetch never rejects but mutate does (`mut-catch-rejection`)
  - 3.2 Guard triggers that must not overlap (`mut-guard-concurrent`)
  - 3.3 Wire mutation success to cache cleanup with invalidates (`mut-invalidates-list`)
  - 3.4 Thread optimistic updates through onMutate context (`mut-optimistic-rollback`)
- 4. Fetch control and lifecycle
  - 4.1 Use abort, reset, and dispose for their distinct lifecycles (`ctl-abort-timeout-dispose`)
  - 4.2 Let deduplication join concurrent reads (`ctl-dedup-join`)
  - 4.3 Refetch on focus and reconnect without auto-fetch (`ctl-focus-reconnect`)
  - 4.4 Defer offline fetches with pauseWhenOffline (`ctl-offline-pause`)
  - 4.5 Poll with refetchInterval standalone (`ctl-polling-intervals`)
  - 4.6 Pick retry counts, predicates, and delays (`ctl-retry-shapes`)
  - 4.7 Preserve subtree references with structuralSharing (`ctl-structural-sharing`)
- 5. Server rendering
  - 5.1 Never call mutate during render (`ssr-mutate-unguarded`)
  - 5.2 Fetch server data directly and seed initialData (`ssr-no-render-fetch`)

## 1. The resource primitive

### 1.1 Set keepPreviousData false for per-key loading windows

**Impact: MEDIUM** - the default keeps stale rows from the previous key on screen during a key-change refetch, which reads as wrong data in pagination and search UIs that need a loading state

On a key change with `refetchOnKeyChange`, the default `keepPreviousData: true` keeps the previous key's data visible for the whole fetch window: `data()` returns the old value, `isLoading()` stays false, `isFetching()` turns true. Pagination and search UIs that must visually reset per key set `keepPreviousData: false`: the key change clears `rawData` to `undefined` (never back to `initialData` - a key change is a refetch, not the never-fetched state), `isLoading()` reads true and `status()` reads `"loading"` until the new key settles. The clear happens only on genuine key changes; enabled flips with an unchanged key never clear.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const page = signal(1);
const rows = resource((p: number) => fetch(`/api/rows?page=${p}`).then((r) => r.json()), {
  key: () => page(),
  refetchOnKeyChange: true,
});
page(2);
// Default keepPreviousData: page 1 rows stay on screen while page 2 loads -
// the user sees stale rows with no loading indication
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

interface Row { id: number; label: string; }
const page = signal(1);
const rows = resource((p: number) => fetch(`/api/rows?page=${p}`).then((r) => r.json()), {
  key: () => page(),
  refetchOnKeyChange: true,
  keepPreviousData: false, // page switch: data clears, status "loading" until settled
});
page(2); // data() undefined, isLoading() true - render the skeleton, not stale rows
```

Reference: `packages/resource/lib/resource.ts` key-change effect and `packages/resource/tests/keep-previous-data.test.ts`

### 1.2 Turn on refetchOnKeyChange for reactive keys

**Impact: MEDIUM** - a reactive key alone never refetches, so signal changes leave the resource serving stale data until something calls fetch or invalidate

A `key` getter reading signals makes the key reactive, but tracking only arms with `refetchOnKeyChange: true` (default false): without it, changing a signal the key reads does nothing until a manual `fetch()` or `invalidate()`. With it on, the effect refetches on every key change. The effect deliberately skips fetches while an explicit key resolves to `null` or `undefined`, so model "dependency not ready yet" as a nullish key and premature requests are skipped for free. `fetch()` (manual) bypasses `enabled` only when `enabled` is a getter; a static `enabled: false` blocks manual fetches too.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const userId = signal(1);
const posts = resource((id: number) => fetch(`/api/users/${id}/posts`).then((r) => r.json()), {
  key: () => userId(),
});
userId(2);
// No refetch happens: key tracking is off, data() still holds user 1's posts
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

interface Post { id: number; title: string; }
const userId = signal<number | null>(null);
const fetchPosts = async (id: number | null): Promise<Post[]> =>
  (await fetch(`/api/users/${id}/posts`)).json();

const posts = resource(fetchPosts, {
  key: () => userId(), // null = not ready: the fetch is skipped
  refetchOnKeyChange: true,
});
userId(2); // automatically fetches user 2's posts
```

Reference: `packages/resource/lib/resource.ts` key-change effect and `packages/resource/docs/concepts/resources.mdx`

### 1.3 Read isLoading, isFetching, and status; aborts never set error

**Impact: HIGH** - aborts and timeouts clear the loading flags without setting error(), so UI branched on error() after cancellation shows nothing and dead spinner logic never settles

`isLoading()` is true only for the initial load (no data at all); `isFetching()` is true for any network activity including background SWR refetches, dedup joins, and mutations; `status()` derives from data and flags, reading raw data so a transform can never change it. Abort paths - `abort()`, `timeout`, an external `abortSignal` - clear both flags without setting `error()`: the error signal only receives real fetcher failures. After a cancellation, `error()` is undefined and status falls back to data-derived (typically `idle`, or `success` when old data exists). Branch cancellation UI off your own abort call sites or `isIdle() && !isFetching()`, never off `error()`. The callbacks fire only on real settlements: `onSuccess` when fetched data lands, `onError` when a truthy error reaches the error signal - never for aborts, nor for the state-clearing calls (fetch start, cache hit, dedup join, reset).

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const query = resource(() => fetch("/api/query").then((r) => r.json()), { timeout: 5000 });
await query.fetch({ force: true });
if (query.error()) {
  // Never reached on timeout: aborts do not set error()
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const query = resource(() => fetch("/api/query").then((r) => r.json()), {
  timeout: 5000,
  initialData: [] as string[],
});
await query.fetch({ force: true });
// Timeout aborts: flags clear, error() stays undefined, initialData still readable
console.log(query.error()?.message ?? "no error", query.isLoading(), query.isFetching(), query.status());
```

Reference: `packages/resource/lib/resource.ts handleError` and `packages/resource/tests/errors.test.ts`

### 1.4 Share one named fetcher to share cache and dedup scope

**Impact: CRITICAL** - cache and dedup entries live under the fetcher's own reference, so inline fetchers and URL strings give every resource a private scope and identical requests never share anything

The cache is a `Map` keyed by fetcher function reference and the dedup registry a `WeakMap` over the same key: scope identity is the fetcher, nothing else. Every `resource(url)` call wraps the URL in a fresh closure, and every inline arrow passed to `resource()` is a new reference, so two resources fetching the identical URL get separate cache scopes, separate dedup scopes, and always two network calls. Declare the fetcher once as a named function and pass that one reference to every consumer (and to `resourceCache.prefetch`) to share cache entries and join in-flight requests.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Two fresh closures: two scopes, two requests, no shared cache
const a = resource("/api/user");
const b = resource("/api/user");
await Promise.all([a.fetch(), b.fetch()]); // fetch() runs twice
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface User { id: number; name: string; }

// One named fetcher: one cache scope and one dedup scope
const fetchUser = async (): Promise<User> => (await fetch("/api/user")).json();

const profile = resource(fetchUser, { key: () => "user", cacheTime: 60_000 });
const header = resource(fetchUser, { key: () => "user", cacheTime: 60_000 });
await Promise.all([profile.fetch(), header.fetch()]); // deduplicated into one request
```

Reference: `packages/resource/lib/resourceCache.ts cacheMap` and `packages/resource/tests/prefetch.test.ts`

### 1.5 Build keys from primitives and plain objects

**Impact: CRITICAL** - keys holding dates, maps, sets, or class instances compare by reference, so a key rebuilt from signals misses the cache and dedup registry on every change and refetches forever

Cache keys are normalized by `stableKey` before every cache and dedup lookup: arrays and plain objects serialize deterministically (object keys sorted, array order preserved, nested dates as ISO strings), so two separately built keys of the same shape hit the same entry. Any other object shape aborts hashing and falls back to reference identity: a top-level `Date`, `Map`, `Set`, or class instance, and also a plain object containing one anywhere inside it. Reference-keyed entries only hit when the exact same object is passed again, which a `key: () => ({ ...filters() })` rebuild never is. Use primitives or plain-object keys; convert dates to ISO strings and maps to plain objects at the key boundary. Hashed keys are opaque strings, so `invalidateByPrefix` and `invalidateByPattern` cannot match them - string keys only.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const since = signal(new Date("2026-01-01"));
// Date keys are reference-keyed: every rebuild of the key misses the cache
const log = resource(
  (d: Date) => fetch(`/api/log?since=${d.toISOString()}`).then((r) => r.json()),
  { key: () => since(), refetchOnKeyChange: true, cacheTime: 60_000 },
);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const since = signal("2026-01-01");
// Primitive keys (and plain objects of primitives) compare structurally
const log = resource(
  (iso: string) => fetch(`/api/log?since=${iso}`).then((r) => r.json()),
  { key: () => since(), refetchOnKeyChange: true, cacheTime: 60_000 },
);
```

Reference: `packages/resource/lib/internal/key.ts stableKey` and `packages/resource/tests/key-serialization.test.ts`

### 1.6 Keep transforms on the raw data plane

**Impact: MEDIUM** - mapping inside the fetcher bakes the view shape into the cache and into mutate's return type, so writers and other readers of the same entry operate on the wrong shape

`transform: (data: T) => TTransformed` maps data for `data()` reads only: `data` is a computed over the raw signal, the cache stores the raw `T`, and `setData`/`mutate` operate on raw `T` end to end. Keep the fetcher returning the server shape and express views through `transform`. Because the cache is keyed by fetcher plus key, two resources on the same named fetcher and key share one raw entry while exposing different transforms - and join the same request through dedup.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Mapping inside the fetcher: the cache now holds view models, and any
// writer on this resource must speak view-model, not the server DTO
const userLabel = resource(async () => {
  const dto = (await (await fetch("/api/user")).json()) as { name: string; email: string };
  return dto.name.toUpperCase();
});
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface UserDto { id: number; name: string; email: string; }
const fetchUser = async (key: string): Promise<UserDto> =>
  (await fetch(`/api/users/${key}`)).json();

// One raw cache entry, two transformed views - both share the fetch and dedup
const userName = resource(fetchUser, {
  key: () => "user-1",
  cacheTime: 60_000,
  transform: (dto) => dto.name,
});
const userEmail = resource(fetchUser, {
  key: () => "user-1",
  cacheTime: 60_000,
  transform: (dto) => dto.email,
});
await Promise.all([userName.fetch(), userEmail.fetch()]);
```

Reference: `packages/resource/lib/resource.ts` data computed and `packages/resource/tests/transform.test.ts`


## 2. Cache management

### 2.1 Pick the right invalidation tool

**Impact: HIGH** - every invalidation method except invalidateResources only deletes cache entries, so mounted resources keep rendering stale data and the screen never refreshes

Deletion is not refetch. `invalidate(key)`, `invalidateMultiple(keys)`, `invalidateByPrefix(prefix)`, `invalidateByPattern(regex)`, and `invalidateAll()` delete cache entries only: a mounted resource keeps its data and only the next fetch for a matched key goes to the network. When the screen must refresh now, call the resource's own `invalidate()` (cache delete plus immediate refetch for that resource) or `resourceCache.invalidateResources([...])`, which invokes each member's `invalidate()` synchronously. Prefix and pattern matching apply to string keys only - structurally hashed object and array keys are opaque strings no prefix or regex can meaningfully match.

**Incorrect (what is wrong):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

const reactPosts = resource((t: string) => fetch(`/api/posts?topic=${t}`).then((r) => r.json()), {
  key: () => "topic-react",
  cacheTime: 60_000,
});
await reactPosts.fetch({ force: true });

resourceCache.invalidateByPrefix("topic-");
// Cache hygiene only: the mounted list keeps rendering the stale fetch -
// nothing refetches until the next explicit fetch
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Post { id: number; topic: string; }
const fetchPosts = async (t: string): Promise<Post[]> =>
  (await fetch(`/api/posts?topic=${t}`)).json();
const reactPosts = resource(fetchPosts, { key: () => "topic-react", cacheTime: 60_000 });

// Cache hygiene for every matching entry...
resourceCache.invalidateByPrefix("topic-");
// ...plus an immediate refetch for the mounted resource
resourceCache.invalidateResources([reactPosts]);
```

Reference: `packages/resource/lib/resourceCache.ts invalidateResources` and `packages/resource/tests/invalidates.test.ts`

### 2.2 Configure the global LRU through setConfig

**Impact: LOW** - mutating the config object returned by resourceCache.config is a silent no-op against a copy, so size limits never change and eviction runs at the defaults

The cache ships with `maxSize: 1000` and `enableLRU: true` globally, across every fetcher scope at once. `resourceCache.config` returns a copy - mutating it changes nothing; `resourceCache.setConfig({ maxSize, enableLRU })` is the only write path (validates types, rejects leaving the old config intact). Eviction is lazy: it runs when a cache write pushes the total entry count over `maxSize`, evicting least-recently-accessed entries first (`resourceCache.get` refreshes `lastAccess`; `resourceCache.map.get` does not). `cleanup()` batches expired-entry deletion and is throttled to one pass per 60 seconds with a 100-entry cap.

**Incorrect (what is wrong):**

```ts
import { resourceCache } from "@hellajs/resource";

// config returns a copy: assigning through it is a silent no-op
resourceCache.config.maxSize = 5000;
console.log(resourceCache.config.maxSize); // still 1000
```

**Correct (what is right):**

```ts
import { resourceCache } from "@hellajs/resource";

resourceCache.setConfig({ maxSize: 5000, enableLRU: true });
const size = resourceCache.map.size; // total entries across all fetcher scopes
console.log(size, resourceCache.config.maxSize); // 5000
```

Reference: `packages/resource/lib/resourceCache.ts setConfig` and `packages/resource/tests/cache.test.ts`

### 2.3 Opt into caching with cacheTime

**Impact: HIGH** - cacheTime defaults to 0 which disables the entire cache phase, so every non-force fetch hits the network and SWR, LRU, and invalidation have nothing to act on

`cacheTime` defaults to `0`, and `0` means no caching at all: the cache lookup phase in `run()` is gated on `cacheTime` being truthy, so without it every non-force `fetch()` falls straight through to dedup or the network. Set `cacheTime` in milliseconds on every resource meant to be cached; entries then live for that TTL from creation. The same rule holds on the manual API: `resourceCache.set(key, data, cacheTime)` requires an explicit `cacheTime` (omission throws, an explicit `0` is a documented no-op).

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()));
await todos.fetch({ force: true });
await todos.fetch(); // cacheTime defaults to 0: a second network request
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {
  cacheTime: 60_000,
});
await todos.fetch({ force: true }); // network
await todos.fetch(); // cache hit within the TTL
```

Reference: `packages/resource/lib/resource.ts` cache phase and `packages/resource/lib/resourceCache.ts set`

### 2.4 Pair staleTime with cacheTime for stale-while-revalidate

**Impact: HIGH** - staleTime without a TTL-valid cache entry never fires, and the default Infinity staleTime means cached data is never refreshed without an explicit refetch trigger

SWR needs both knobs: `cacheTime` keeps the entry alive (TTL), `staleTime` marks it fresh inside that window. A fetch that hits a fresh entry returns it with no network. A fetch that hits a stale-but-unexpired entry returns the cached data immediately and, when `revalidateOnStale` is true (default), fires a background force refetch: `isFetching()` true, `isLoading()` false, `data()` keeps serving the previous value until the background fetch lands. Resources default `staleTime` to `Infinity` (never stale - a cache hit never triggers revalidation), while `resourceCache.set` defaults it to `0` (always stale); set `revalidateOnStale: false` to serve stale data without the background refetch.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const user = resource(() => fetch("/api/user").then((r) => r.json()), {
  staleTime: 30_000,
});
await user.fetch({ force: true });
// staleTime with no cacheTime: no entry survives, every fetch() is a network call
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const user = resource(() => fetch("/api/user").then((r) => r.json()), {
  cacheTime: 300_000, // 0-30s fresh: instant cache hits, no network
  staleTime: 30_000, // 30s-5min stale: cached data now + background refetch
});
await user.fetch(); // network
await user.fetch(); // stale window: returns cached data, refetches behind it
```

Reference: `packages/resource/lib/resource.ts` cache phase and `packages/resource/tests/stale.test.ts`

### 2.5 Warm caches with prefetch and a shared fetcher reference

**Impact: MEDIUM** - prefetching with an inline fetcher writes a scope the mounted resource will never read, so the resource refetches what was just prefetched

`resourceCache.prefetch({ fetcher, key, ... })` fetches and caches without creating a resource, under the fetcher's own scope - exactly the scope a `resource()` with the same fetcher reference reads. It deduplicates (a concurrent same-fetcher+key prefetch or fetch joins one request), retries, and honors `timeout` and `abortSignal` like a resource fetch. The sharing is by reference identity only: an inline arrow passed to `prefetch` and a URL-string resource can never join a prefetched entry, because each creates its own scope. `cacheTime` defaults to `0` there too - a prefetch meant to warm must set it.

**Incorrect (what is wrong):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

// Inline fetcher: its prefetch warms a scope nothing else will ever read
await resourceCache.prefetch({
  fetcher: (key: string) => fetch(`/api/posts/${key}`).then((r) => r.json()),
  key: "react",
});
const posts = resource((k: string) => fetch(`/api/posts/${k}`).then((r) => r.json()), {
  key: () => "react",
  cacheTime: 60_000,
});
await posts.fetch(); // still a network call
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Post { id: number; title: string; }
const fetchPosts = async (key: string): Promise<Post[]> =>
  (await fetch(`/api/posts/${key}`)).json();

// Same fetcher reference: the resource joins the prefetched cache entry
await resourceCache.prefetch({ fetcher: fetchPosts, key: "react", cacheTime: 60_000 });
const posts = resource(fetchPosts, { key: () => "react", cacheTime: 60_000 });
await posts.fetch(); // cache hit - no network
```

Reference: `packages/resource/lib/resourceCache.ts prefetch` and `packages/resource/tests/prefetch.test.ts`

### 2.6 resourceCache.set writes a separate public scope

**Impact: MEDIUM** - manual entries coexist with resource entries of the same key instead of seeding them, so a seeded resource silently refetches

The cache is two-level: `Map<scope, Map<key, entry>>`, where a resource's scope is its fetcher reference. `resourceCache.set` writes to a dedicated public scope instead, so a manual entry and a resource entry with the same key are two separate entries that coexist; cross-scope reads like `resourceCache.get` return the first TTL-valid hit, but a resource's own fetch path only ever looks in its fetcher's scope. To warm a resource's cache, use `resourceCache.prefetch` with the same fetcher reference (or pass `initialData`); `resourceCache.set` never seeds a resource scope.

**Incorrect (what is wrong):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

// Manual entry in the public scope...
resourceCache.set("todos", [{ id: 1, text: "Seed" }], 60_000);

// ...never seeds this resource's fetcher scope: fetch() still hits the network
const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {
  key: () => "todos",
  cacheTime: 60_000,
});
await todos.fetch();
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Todo { id: number; text: string; }
const fetchTodos = async (): Promise<Todo[]> => (await fetch("/api/todos")).json();

// Same fetcher reference: prefetch writes into the scope the resource reads
await resourceCache.prefetch({ fetcher: fetchTodos, key: "todos", cacheTime: 60_000 });
const todos = resource(fetchTodos, { key: () => "todos", cacheTime: 60_000 });
await todos.fetch(); // cache hit - no network
```

Reference: `packages/resource/lib/resourceCache.ts PUBLIC_SCOPE` and `packages/resource/tests/collision.test.ts`

### 2.7 Use resetResource for factory resets, invalidateAll for cache only

**Impact: MEDIUM** - resetResource clears dedup registrations and online subscriptions of every live resource, so calling it mid-app silently degrades unrelated views

`invalidateAll()` clears the cache map and nothing else. `resetResource()` is the full factory reset: cache map, in-flight dedup registrations, online-status callbacks, and the cleanup throttle - the boundary for logout flows in fresh apps, HMR reinitialization, and test setup. It is module-level and global: calling it while other components hold live resources drops their online subscriptions and dedup sharing mid-flight. In app flows where resources stay alive, use targeted invalidation (`invalidateByPrefix`, `invalidateAll`) instead; reserve `resetResource()` for teardown boundaries where nothing survives.

**Incorrect (what is wrong):**

```ts
import { resetResource } from "@hellajs/resource";

function onLogout() {
  // Nukes every live resource's dedup scope and online subscriptions,
  // not just the user's cache entries
  resetResource();
}
```

**Correct (what is right):**

```ts
import { resource, resourceCache, resetResource } from "@hellajs/resource";

// App logout: clear cached user data, live resources keep working
function onLogout() {
  resourceCache.invalidateByPrefix("user:");
}

// Test/HMR boundary: full factory reset (cache, dedup, callbacks, throttle)
resetResource();
const fresh = resource(() => fetch("/api/session").then((r) => r.json()), {});
await fresh.fetch();
```

Reference: `packages/resource/lib/resetResource.ts resetResource` and `packages/resource/tests/reset-resource.test.ts`

### 2.8 Write cache updates through setData, update, and updateMultiple

**Impact: MEDIUM** - mutating the cached array or object in place changes entry data without touching the resource signal, so nothing re-renders and no reactive update ever fires

Cached data is served through reactive state: readers re-render because `setData` writes a new value into the raw signal (and the cache entry when `cacheTime > 0`), not because the cached object changed. Never mutate `data()` in place - the reference stays identical, no signal fires, and dependent UI keeps the old render. Use `setData(value)` or `setData((old) => next)` on the owning resource; use `resourceCache.update(key, updater)` / `updateMultiple(updates)` for cross-cutting writes against entries regardless of owning resource (`update` returns false on miss or expiry; both throw on an undefined updater). `resourceCache.map` is the read-only flat view: `map.get` does not refresh `lastAccess`, `resourceCache.get` does - they are different code paths.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {
  key: () => "todos",
  cacheTime: 60_000,
});
await todos.fetch();
// In-place mutation: same reference, no signal fires, nothing re-renders
(todos.data() as string[]).push("new item");
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Todo { id: number; text: string; done: boolean; }
const fetchTodos = async (): Promise<Todo[]> => (await fetch("/api/todos")).json();
const todos = resource(fetchTodos, { key: () => "todos", cacheTime: 60_000 });
await todos.fetch();

// New array identity through setData: the signal fires, the cache entry follows
todos.setData((old) => [...(old ?? []), { id: 4, text: "Ship it", done: false }]);
// Cross-cutting write against the entry itself
resourceCache.updateMultiple<Todo>([
  { key: "todo-3", updater: { id: 3, text: "Renamed", done: true } },
]);
```

Reference: `packages/resource/lib/resource.ts setData` and `packages/resource/tests/resource-cache-update.test.ts`


## 3. Mutations

### 3.1 Catch mutate calls; fetch never rejects but mutate does

**Impact: HIGH** - a fire-and-forget mutate produces an unhandled promise rejection on every failure, abort, and onSettled throw

The two request paths have opposite rejection contracts. `fetch(options)` never rejects: it resolves the data on success or cache hit and `undefined` on error, skip, or abort - errors surface through `error()` and `onError`, so fire-and-forget calls gain no unhandled rejections. `mutate(variables)` returns a real promise and rejects: with the mutation error on failure, with a `DOMException` named `AbortError` on abort, and with a callback's own error when `onSettled` throws (which leaves committed data and `success` status intact). Every mutate call that is not awaited needs a `.catch`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const addTodo = resource(
  async (draft: { text: string }) => (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json(),
  {},
);
addTodo.mutate({ text: "Learn mutations" }); // unhandled rejection on failure
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Todo { id: number; text: string; }
const addTodo = resource(
  async (draft: Omit<Todo, "id">): Promise<Todo> =>
    (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json() as Promise<Todo>,
  {},
);
// fetch() never rejects; mutate() does - catch every fire-and-forget call
addTodo.mutate({ text: "Learn mutations" }).catch(() => {
  // handled in onSettled / resource error state
});
```

Reference: `packages/resource/lib/types/resource.d.ts Resource` and `packages/resource/tests/mutations.test.ts`

### 3.2 Guard triggers that must not overlap

**Impact: HIGH** - every mutate call runs independently, so an unguarded double-click fires two POSTs and double-creates rows or double-charges

Concurrent `mutate()` calls are independent by design: each owns its abort controller, its `onMutate` context, and its settlement; a second call never aborts the first, and reads never abort mutations either (only `abort()` cancels everything). For operations that must not overlap - payments, row creation - guard the trigger while a mutation is in flight with `isFetching()` (true during mutation execution) or a disabled button state. For operations that may overlap, let them run: each call's `onSettled` receives its own context, so overlapping optimistic updates roll back independently.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const checkout = resource(
  async (cart: unknown) => (await fetch("/api/checkout", { method: "POST", body: JSON.stringify(cart) })).json(),
  {},
);
function onSubmit() {
  // Double-click: two independent mutations, two charges
  checkout.mutate({ items: [1, 2] }).catch(() => {});
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const checkout = resource(
  async (cart: unknown) => (await fetch("/api/checkout", { method: "POST", body: JSON.stringify(cart) })).json(),
  {},
);
function onSubmit() {
  if (checkout.isFetching()) return; // single-flight guard: ignore double-submits
  checkout.mutate({ items: [1, 2] }).catch(() => {});
}
```

Reference: `packages/resource/docs/concepts/resources.mdx` and `packages/resource/tests/mutations.test.ts`

### 3.3 Wire mutation success to cache cleanup with invalidates

**Impact: MEDIUM** - invalidates only deletes cache entries, so the screen keeps showing the pre-mutation data until something else fetches again

`invalidates: Array<string | RegExp>` runs after a successful mutation: strings dispatch to `resourceCache.invalidateByPrefix`, RegExp to `invalidateByPattern`, deleting matched entries so the next fetch for those keys goes to the network. It deletes cache only - mounted resources keep rendering their current data; refresh those explicitly with the resource's `invalidate()` or `resourceCache.invalidateResources`. No invalidation runs on mutation error, abort, or a throwing success-path `onSettled` (settlement did not complete). Matching is string-keys-only like the underlying methods, so object-keyed resources cannot be invalidated this way.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const saveUser = resource(async () => (await fetch("/api/user", { method: "PUT" })).json(), {
  invalidates: ["user:"],
});
await saveUser.mutate({ name: "Ada" });
// Cache entries deleted - but the mounted profile resource keeps showing
// the stale name: nothing refetches it
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const profile = resource(() => fetch("/api/user").then((r) => r.json()), {
  key: () => "user:1",
  cacheTime: 60_000,
});
const saveUser = resource(async () => (await fetch("/api/user", { method: "PUT" })).json(), {
  invalidates: ["user:", /^posts:\d+$/], // cache cleanup on success
});
await saveUser.mutate({ name: "Ada" });
profile.invalidate(); // refresh the mounted view now
```

Reference: `packages/resource/lib/resource.ts mutate` and `packages/resource/tests/invalidates.test.ts`

### 3.4 Thread optimistic updates through onMutate context

**Impact: CRITICAL** - an optimistic write without a rollback path strands fake data on failure or abort, and onSettled never fires for aborted mutations so the rollback must not depend on it alone

The mutation lifecycle exists for optimistic updates: `onMutate(variables)` runs before the fetcher - write the optimistic state there and return a context (snapshot, temp id); `onSettled(data, error, variables, context)` receives that same context on success and failure, so the error arm can roll the optimistic write back precisely. Two abort facts shape the pattern: `onSettled` is skipped entirely when a mutation aborts, even after `onMutate` already ran, so a timeout, external `abortSignal`, or `abort()` leaves the optimistic state in place unless the abort initiator handles it; and a throw inside a success-path `onSettled` never flips the resource to error - the committed data stands and `invalidates` is skipped. Mutations write raw-type data; pair with the read resource's `setData` and finish with `invalidate()`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()), {});
const addTodo = resource(
  async (draft: { text: string }) => (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json(),
  {
    onMutate: async () => {
      todos.setData((old) => [...(old ?? []), { id: -1, text: "saving..." }]);
      // No context returned: the rollback has no snapshot to restore
    },
  },
);
await addTodo.mutate({ text: "Learn mutations" });
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Todo { id: number; text: string; pending?: boolean; }
type Draft = Omit<Todo, "id">;

const todos = resource<Todo[]>(() => fetch("/api/todos").then((r) => r.json()), {});
const addTodo = resource(
  async (draft: Draft): Promise<Todo> =>
    (await fetch("/api/todos", { method: "POST", body: JSON.stringify(draft) })).json() as Promise<Todo>,
  {
    onMutate: async (variables) => {
      const temp: Todo = { id: Date.now(), ...(variables as Draft), pending: true };
      todos.setData((old) => [...(old ?? []), temp]);
      return { temp }; // context threads to this call's onSettled
    },
    onSettled: async (created, error, variables, context) => {
      const temp = (context as { temp: Todo } | undefined)?.temp;
      if (error && temp) {
        todos.setData((old) => (old ?? []).filter((t) => t.id !== temp.id));
      }
      todos.invalidate();
    },
  },
);
await addTodo.mutate({ text: "Learn mutations" });
```

Aborted mutations skip `onSettled` by design: when a mutation can be aborted (timeout, external signal), roll the optimistic write back at the abort call site too.

Reference: `packages/resource/lib/resource.ts mutate` and `packages/resource/tests/mutation-abort.test.ts`


## 4. Fetch control and lifecycle

### 4.1 Use abort, reset, and dispose for their distinct lifecycles

**Impact: HIGH** - dispose leaves the resource dead forever and does not cancel in-flight requests, so using it as a refresh or cancel handle strands timers and late data writes

`timeout` (ms before the internal controller fires) and an external `abortSignal` wire onto every internal controller and compose freely - both abort reads and mutations without setting `error()`. The three teardown verbs differ: `abort()` cancels the read and every in-flight mutation, resets data to `initialData`, and stops polling permanently (recreate the resource to resume polling); `reset()` returns to initial state, clears listeners, and re-arms polling, but does not abort in-flight requests; `dispose()` is one-way teardown of effects, timers, and listeners only - it neither aborts in-flight (a resolving fetcher still updates data after dispose) nor clears the cache, and the resource is dead afterward. Late resolutions after `abort()` are ignored.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const session = resource(() => fetch("/api/session").then((r) => r.json()), {
  refetchInterval: 5000,
});
session.dispose();
session.fetch(); // resource is dead: no reactive fetches, polling never resumes
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const controller = new AbortController();
const session = resource(() => fetch("/api/session").then((r) => r.json()), {
  timeout: 5000,
  abortSignal: controller.signal,
  refetchInterval: 5000,
});
await session.fetch({ force: true }); // timeout aborts after 5s; error() stays undefined
controller.abort(); // coordinated external cancel: data resets to initialData
session.dispose(); // unmount teardown; does not abort in-flight, does not clear cache
```

Reference: `packages/resource/lib/resource.ts abort` and `packages/resource/tests/fetching.test.ts`

### 4.2 Let deduplication join concurrent reads

**Impact: HIGH** - hand-rolled in-flight guards or cache-fighting ad-hoc fetch calls duplicate the exact dedup the package already runs, or break it by isolating the fetcher

`deduplicate` (default true) joins concurrent requests with the same fetcher and key into one network call: every joiner awaits the same promise and adopts the shared abort controller. The mechanism already absorbs the classic duplicate-fetch storms - a tab return firing focus plus visibility back-to-back, SWR overlapping a manual fetch, several components mounting around one key. Let each consumer call `fetch()` freely and share a named fetcher; do not wrap resources in your own in-flight maps. Two facts to code against: `fetch({ force: true })` skips the dedup lookup (but still registers, so later non-force fetches join the force request while it runs), and aborting one joined resource aborts the shared request and resets every joiner to its `initialData`.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const topic = signal("react");
let inFlight = false; // hand-rolled guard duplicating deduplicate
const posts = resource((t: string) => fetch(`/api/posts?topic=${t}`).then((r) => r.json()), {
  key: () => topic(),
});
function load() {
  if (inFlight) return;
  inFlight = true;
  posts.fetch().finally(() => {
    inFlight = false;
  });
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Post { id: number; title: string; }
const fetchPosts = async (t: string): Promise<Post[]> =>
  (await fetch(`/api/posts?topic=${t}`)).json();

// Every consumer just fetches; concurrent same-key calls join one request
const a = resource(fetchPosts, { key: () => "react", cacheTime: 60_000 });
const b = resource(fetchPosts, { key: () => "react", cacheTime: 60_000 });
await Promise.all([a.fetch(), b.fetch()]); // one network call
```

Reference: `packages/resource/lib/internal/dedupe.ts` and `packages/resource/tests/deduplication.test.ts`

### 4.3 Refetch on focus and reconnect without auto-fetch

**Impact: LOW** - hand-rolled window listeners beside a resource duplicate built-in triggers and miss the dedup that collapses back-to-back focus events

`refetchOnWindowFocus` and `refetchOnReconnect` arm standalone listeners - neither needs `refetchOnKeyChange`, so they layer onto manually fetched resources. Focus fires on both `visibilitychange` (tab becomes visible) and the window `focus` event (app switch without hiding the tab); when a tab return fires both back-to-back, deduplication collapses them into one network call. The browser fires `focus` once at page load, so expect one extra fetch on mount. Reconnect subscribes through `resourceCache.onOnlineChange`. Both listeners clear on `abort()`, `reset()`, and `dispose()`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const session = resource(() => fetch("/api/session").then((r) => r.json()), {});
window.addEventListener("focus", () => session.fetch()); // hand-rolled focus refetch
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const session = resource(() => fetch("/api/session").then((r) => r.json()), {
  refetchOnWindowFocus: true, // visibilitychange + focus, deduped
  refetchOnReconnect: true, // online event
});
await session.fetch({ force: true }); // listeners are live with or without this
```

Reference: `packages/resource/lib/internal/lifecycle.ts createFocus` and `packages/resource/tests/focus.test.ts`

### 4.4 Defer offline fetches with pauseWhenOffline

**Impact: MEDIUM** - without the option an offline browser turns every poll tick and key-change refetch into a user-visible error state, when deferral is the correct UX

By default an offline browser fails every fetch attempt into `error()`. `pauseWhenOffline: true` defers instead: while offline, `run()` returns before the fetcher is called - no network attempt, no error state, `isPaused()` reads true - and the deferred fetch replays on reconnect with the force flag it was called with. Deferral happens before the cache lookup, so even a TTL-fresh cache hit defers while offline; polling ticks and key-change refetches defer the same way. In-flight requests are not paused (they fail as usual), and mutations never pause. Read browser state with `resourceCache.isOnline()` and subscribe through `resourceCache.onOnlineChange(cb)` (returns its unsubscribe) for connection banners.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const feed = resource(() => fetch("/api/feed").then((r) => r.json()), {
  refetchInterval: 10_000,
});
// Offline: every poll tick fails into error() and flips the UI to an error state
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

const feed = resource(() => fetch("/api/feed").then((r) => r.json()), {
  pauseWhenOffline: true,
  refetchInterval: 10_000,
});
const unsubscribe = resourceCache.onOnlineChange((online) => {
  // Offline ticks defer (isPaused() true); reconnect replays the deferred fetch
  if (!online) console.log("offline - feed deferred:", feed.isPaused());
});
unsubscribe();
```

Reference: `packages/resource/lib/resource.ts run` and `packages/resource/tests/offline-pausing.test.ts`

### 4.5 Poll with refetchInterval standalone

**Impact: MEDIUM** - gating polling behind refetchOnKeyChange or a hand-rolled setInterval both under- and over-fires - the built-in timer is visibility-aware and cadence-stable

`refetchInterval` arms on its own - no `refetchOnKeyChange` needed, and it works with purely manual `fetch()`. It accepts a fixed number of ms, a function `(data) => number | false` re-evaluated after every tick for adaptive cadences (return `false` to stop), or `false`. Ticks skip while `document.visibilityState` is `"hidden"` unless `refetchIntervalInBackground: true`. Key changes never reset the cadence; `reset()` restarts polling at its interval; `abort()` stops it permanently (recreate to resume); `dispose()` clears the timer - call it on unmount for every polling resource.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const stats = resource(() => fetch("/api/stats").then((r) => r.json()), {
  refetchOnKeyChange: true, // added just to make polling "work"
  refetchInterval: 10_000,
});
setInterval(() => stats.fetch({ force: true }), 10_000); // plus a hand-rolled timer
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Health { status: string; }
const health = resource<Health>(() => fetch("/api/health").then((r) => r.json()), {
  // Adaptive: poll fast while unhealthy, slow while fine
  refetchInterval: (data) => (data?.status === "unhealthy" ? 1000 : 30_000),
});
await health.fetch(); // arms without refetchOnKeyChange; skips ticks while hidden
health.dispose(); // stop the timer on unmount
```

Reference: `packages/resource/lib/internal/polling.ts createPolling` and `packages/resource/tests/polling.test.ts`

### 4.6 Pick retry counts, predicates, and delays

**Impact: MEDIUM** - a bare retry count re-issues 404s and other permanent failures, burning battery and hammering the API for responses that will never change

`retry` accepts a number (attempts), a boolean (`true` is exactly one retry), or a predicate `(failureCount, error)` where the count starts at 1 on the first failure and `error` is a categorized `ResourceError` (`.category`: `not_found`, `server`, `client`, `unknown`; `.statusCode` when the message carried an HTTP status). `retryDelay` accepts fixed ms (default 1000) or `(attempt, error) => ms` for exponential backoff. Retry applies to fetches and mutations alike; abort errors never retry, an abort during the delay interrupts it, and retries happen before caching - a retried-then-successful fetch caches the successful result. Use the predicate to retry transient classes only.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Retries 404s three times: the resource will never appear
const user = resource((id: string) => fetch(`/api/users/${id}`).then((r) => r.json()), {
  retry: 3,
});
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const resilient = resource(() => fetch("/api/data").then((r) => r.json()), {
  retry: (count, error) => error.category !== "not_found" && count < 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** (attempt - 1), 30_000),
});
await resilient.fetch({ force: true });
```

Reference: `packages/resource/lib/internal/retry.ts fetchWithRetry` and `packages/resource/tests/retry.test.ts`

### 4.7 Preserve subtree references with structuralSharing

**Impact: MEDIUM** - every fetch produces fresh references by default, so computeds derived from unchanged subtrees re-run on each poll or refetch and re-render work scales with response size

By default a successful fetch writes the fresh result object graph as-is: every array and object is a new reference even when structurally identical, so downstream computeds keyed to any subtree re-evaluate after every refetch. `structuralSharing: true` compares prev and next structurally (arrays and plain objects recursed, `Object.is` for primitives) and reuses the previous references for unchanged subtrees - only changed paths get new containers. `Map`, `Set`, `Date`, and class instances are compared by strict equality and never merged. It applies to the fetch-success path only; `setData` and `mutate` are unaffected. Polling resources feeding fine-grained derivations are the primary beneficiaries.

**Incorrect (what is wrong):**

```ts
import { computed } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const report = resource(() => fetch("/api/report").then((r) => r.json()), {
  refetchInterval: 5000,
});
// Every poll: fresh row references, this computed re-runs even when
// no row changed - and everything reading it re-renders
const rowCount = computed(() => report.data()?.rows.length ?? 0);
```

**Correct (what is right):**

```ts
import { computed } from "@hellajs/core";
import { resource } from "@hellajs/resource";

interface Row { id: number; total: number; }
interface Report { rows: Row[]; generatedAt: string; }

const report = resource<Report>(() => fetch("/api/report").then((r) => r.json()), {
  refetchInterval: 5000,
  structuralSharing: true, // unchanged subtrees keep their references
});
const grandTotal = computed(() => {
  let sum = 0;
  for (const row of report.data()?.rows ?? []) sum += row.total;
  return sum;
});
console.log(grandTotal());
```

Reference: `packages/resource/lib/internal/structural.ts structuralShare` and `packages/resource/tests/structural-sharing.test.ts`


## 5. Server rendering

### 5.1 Never call mutate during render

**Impact: HIGH** - mutate is deliberately unguarded by the server check, so a render-path call fires a real network write from the server instead of failing fast

Reads no-op on the server, but `mutate()` is intentionally unguarded by the window check: it is user-initiated by contract, and guarding it would silently drop legitimate client-side mutations. The consequence is directional - code that reaches `mutate()` from a render path (a component body, a top-level statement, an effect that runs during server stringification) executes a real network write from the server. Keep `mutate()` in event handlers and client-only code paths, and let the resource's read side carry server data through `initialData`.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const save = resource(
  async (draft: { text: string }) => (await fetch("/api/notes", { method: "POST", body: JSON.stringify(draft) })).json(),
  {},
);
// Render-path call: on the server this POSTs for real, once per render
function NoteEditor() {
  save.mutate({ text: "hello" });
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Draft { text: string; }
const save = resource(
  async (draft: Draft): Promise<{ ok: boolean }> =>
    (await fetch("/api/notes", { method: "POST", body: JSON.stringify(draft) })).json() as Promise<{ ok: boolean }>,
  {},
);

// Event handlers run client-side only - mutate stays off the server render path
function onSave() {
  save.mutate({ text: "hello" }).catch(() => {});
}
onSave();
```

Reference: `packages/resource/tests/ssr-mode.test.ts` and `packages/resource/docs/concepts/resources.mdx`

### 5.2 Fetch server data directly and seed initialData

**Impact: HIGH** - expecting the resource to fetch during a server render leaves data undefined forever - run() returns before the fetcher whenever window is absent

`run()` guards on window presence as its first line: on a server there is no fetch - resources embedded in a server-rendered tree never trigger network calls, and focus or polling listeners never arm. Render-time data must be produced outside the resource: fetch server-side with direct `fetch()` (or your data layer) and hand the result over as `initialData`. The resource then starts with data already present and stays consistent when client-side fetching takes over.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Server render: this fetch never happens - run() returns before the fetcher
const user = resource(() => fetch("/api/user").then((r) => r.json()));
await user.fetch(); // resolves undefined server-side; data() stays undefined
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface UserDto { id: number; name: string; }

// Server code fetches directly; the resource never fetches during render
function createUser(serverUser: UserDto | undefined) {
  return resource((key: string) => fetch(`/api/users/${key}`).then((r) => r.json()), {
    key: () => "user-1",
    initialData: serverUser,
  });
}
```

Reference: `packages/resource/lib/resource.ts run` and `packages/resource/tests/ssr-mode.test.ts`

