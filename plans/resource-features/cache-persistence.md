## [ ] Cache Persistence
**Type:** Code

### Depends On
- resource-features/ssr-serialize-hydrate (`toJSON`/`hydrate` provide the serialization layer that persistence builds on)

### Objective

Manual save/restore for the cache via `resourceCache.save(adapter)` and `resourceCache.load(adapter)`, backed by a `StorageAdapter` interface supporting localStorage, sessionStorage, or any key-value store.

### Solution

**Files touched:**
- `packages/resource/lib/cache.ts` — add `save` and `load` methods to the `resourceCache` object
- `packages/resource/lib/types/cache.d.ts` — extend `ResourceCache` interface; add `StorageAdapter` interface

**Strategy:**

1. **`StorageAdapter` interface**:
```typescript
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```
Built-in adapters are not provided in `@hellajs/resource` itself — users supply their own (e.g., `localStorage` matches the interface directly, or a simple wrapper for `AsyncStorage`). This keeps the zero-dependency promise.

2. **`resourceCache.save(adapter, key?)`** — Calls `resourceCache.toJSON()` (from the SSR feature), serializes to JSON with `JSON.stringify`, and writes to `adapter.setItem(key, value)`. Default key: `"@hellajs/resource"`.

3. **`resourceCache.load(adapter, key?)`** — Reads from `adapter.getItem(key)`, parses with `JSON.parse`, and calls `resourceCache.hydrate()` (from the SSR feature). Returns the number of entries restored, or `0` if no persisted state exists.

**Key decisions:**
- Manual save/restore only — no auto-persist with debounce. This keeps the API simple, avoids write amplification, and gives users full control over when persistence happens.
- Depends on `toJSON` and `hydrate` from the SSR feature (idea 5). If those are not yet implemented, `save`/`load` can work directly with the cache map by implementing their own serialization inline.
- No adapter implementations shipped — users supply adapters. This keeps the bundle size unchanged and avoids dependencies on Web Storage APIs that may not exist in all environments.
- The `key` parameter allows partitioning: `save(localStorage, "users")`, `load(localStorage, "users")`.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — `resourceCache` API extension
- [ ] `resourceCache.save(adapter)` serializes non-expired cache entries and writes them via the adapter
- [ ] `resourceCache.load(adapter)` reads adapter data, restores entries, returns count
- [ ] After `save` then `load` into a fresh cache, `resourceCache.get()` returns the same values
- [ ] `resourceCache.load(adapter)` with no stored data returns `0` without error
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
