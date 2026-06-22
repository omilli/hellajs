## [ ] SSR Serialize and Hydrate
**Type:** Code

### Depends On
- resource-features/prefetch-api (prefetch is a building block for server-side prefetch)

### Objective

Two new methods on `resourceCache`: `toJSON()` serializes all non-expired cache entries (including metadata) into a JSON-compatible structure; `hydrate(entries)` bulk-populates the cache from a serialized payload. Together they enable server-side prefetch → serialize → client-side hydration.

### Solution

**Files touched:**
- `packages/resource/lib/cache.ts` — add `toJSON` and `hydrate` methods to the `resourceCache` object
- `packages/resource/lib/types/cache.d.ts` — extend `ResourceCache` interface; add `SerializedCacheEntry` and `SerializedCache` types

**Strategy:**

1. **`resourceCache.toJSON()`** — Iterates all fetcher scopes (and the public scope). For each non-expired entry, produces a serialized entry:
```typescript
interface SerializedCacheEntry {
  scope: string; // "__public__" for public scope, or a stable fetcher identifier
  key: unknown;  // The cache key
  data: unknown; // The cached data (must be JSON-serializable)
  timestamp: number;
  cacheTime: number;
  staleTime: number;
  lastAccess: number;
}
```
Returns `{ entries: SerializedCacheEntry[] }`.

2. **`resourceCache.hydrate(payload)`** — Accepts `{ entries: SerializedCacheEntry[] }`. For each entry, resolves the scope (public or fetcher-scoped) and calls `setCacheData` with the stored values. Entries with expired `cacheTime` are skipped.

3. **Scope handling during serialization**: Fetcher-scoped entries are keyed by function reference in memory. During serialization, there is no stable string key for a fetcher function. Three approaches — pick one:
   - **Approach A**: Serialize only public-scope entries (from `resourceCache.set()`). This avoids the fetcher identity problem entirely. Fetcher-scoped entries are not serialized.
   - **Approach B**: Require an optional `serializeScope` option on `resource()` that provides a string scope name, used during serialization instead of the fetcher reference.
   - **Approach C**: Skip fetcher-scoped entries in `toJSON()` initially. Document that SSR hydration works best with the `prefetch` API (idea 4), which stores into the public scope or a user-named scope.

**Recommended: Approach C** — `toJSON()` only serializes public-scope entries. For SSR, the user calls `resourceCache.prefetch({ fetcher, key, cacheTime })` on the server (which writes to the fetcher scope), and the entry is available to client-side resources sharing the same fetcher. The serialized entries from `toJSON()` serve as an additional layer — manual cache entries that survive across server/client.

4. **Hydration timing**: `hydrate()` is an explicit call. The recommended integration pattern for a framework adapter (e.g., Astro, Next.js) is:
   - Server: prefetch data, render, call `toJSON()`, inject JSON into HTML.
   - Client: call `hydrate(JSON.parse(el.textContent))` before creating any resources.

**Key decisions:**
- Explicit hydrate (user calls it) — no auto-magic.
- `toJSON` includes all non-expired entries regardless of staleness.
- Fetcher-scoped entries are not serialized in v1 — the prefetch API is the recommended server-side mechanism.
- No changes needed to existing `resource()` behavior.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — `resourceCache` API extension
- [ ] `resourceCache.toJSON()` returns a JSON-serializable object with non-expired entries
- [ ] Expired entries are excluded from `toJSON()`
- [ ] `resourceCache.hydrate(payload)` populates the public scope from a serialized payload
- [ ] Hydrated entries are returned by `resourceCache.get()` and `resourceCache.map.get()`
- [ ] Fetcher-scoped entries are not serialized by default (documented limitation)
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
