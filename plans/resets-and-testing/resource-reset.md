## [ ] Add resetResource nuke
**Type:** Code

### Depends On
- None

### Objective
`@hellajs/resource` exports a `resetResource()` factory-reset that clears the cache, the deduplication map, the online-status subscriber set, and the cleanup throttle — a real-world nuke (logout, HMR, error recovery), not a test hook.

### Solution
`resourceCache.invalidateAll()` only does `cacheMap.clear()` (`lib/cache.ts:341`) — proven insufficient: it leaves `onlineCallbacks` (`cache.ts:17`, a subscriber leak), `lastCleanupTime` (`cache.ts:14`), and `ongoingRequestsMap` (`lib/internal/dedupe.ts:17`).

Add `packages/resource/lib/resetResource.ts` exporting `resetResource(): void`:
- In `lib/cache.ts`, add an `@internal resetCacheState()` that calls `cacheMap.clear()`, `onlineCallbacks.clear()`, and `lastCleanupTime = 0`.
- In `lib/internal/dedupe.ts`, change `ongoingRequestsMap` from `const` to `let` and add an `@internal resetDedupe()` that reassigns `ongoingRequestsMap = new WeakMap()` (WeakMap has no `.clear()`; reassign per the `guides/code.md` memory rule).
- `resetResource()` calls `resetCacheState()` then `resetDedupe()`. Export from `lib/index.ts`.

New public symbol, non-breaking → minor changeset for `@hellajs/resource`.

```ts
import { resetResource } from "@hellajs/resource";
// On logout / HMR / catastrophic recovery:
resetResource(); // cache + dedup + online subscribers + cleanup throttle
```

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Solution includes a runnable code example for `resetResource` (above)
- [ ] `resetResource` and the two new `@internal` helpers (`resetCacheState`, `resetDedupe`) have JSDoc
- [ ] A changeset exists at `.changeset/*.md` declaring `minor` for `@hellajs/resource`
- [ ] Audit skill run on `resetResource.ts`, `cache.ts`, `internal/dedupe.ts`, `index.ts` reports no deviations from `./guides/code.md`
