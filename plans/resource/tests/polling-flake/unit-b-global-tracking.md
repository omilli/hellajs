---
depends_on: []
---

# [ ] Unit B: Global resource tracking with stop-all for `resetResource()`

## Gap

`resetResource()` clears cache, dedup, and online callbacks but **cannot stop active polling timers or in-flight requests** because there is no global registry of active resources. Any resource whose `dispose()` was not called (e.g., a test that threw before reaching it) leaks a `setTimeout` that calls `run(false)` indefinitely, corrupting subsequent tests.

**Scope hint:** `internal` (surface: no — new internal tracking, no new public exports).

**Citations:**
- `packages/resource/lib/resetResource.ts` — exports `resetResource()`, only calls `resetCacheState()` + `resetDedupe()`
- `packages/resource/lib/resource.ts` — `resource()` factory; tracked via module-level `Map` similar to `cacheMap`
- `packages/resource/lib/internal/polling.ts` — `createPolling` returns `{ setup, clear }`; no global registry
- `packages/resource/tests/reset-resource.test.ts` — tests verify reset clears cache/callbacks/dedup; would need a "stops active timers" scenario
- `packages/resource/lib/internal/dedupe.ts` — `ongoingRequestsMap` uses `WeakMap`; `resetDedupe` replaces the map

**Type tag:** Code + Tests

## Strategy

Add a module-level `activeResources: Set<{ dispose: () => void }>` in a new file `lib/internal/registry.ts`. Every `resource()` call registers its `dispose` function into the set; the `dispose` implementation removes itself on call. `resetResource()` iterates the set and calls `dispose()` on every entry, then clears it.

This mirrors the existing pattern used by cache scopes (`Map` of fetcher → `Map` of key → entry) and dedup (`ongoingRequestsMap WeakMap`), but is simpler: a single `Set` of cleanup handles.

### Trade-offs considered

- **WeakRef**: Would let GC dispose automatically, but polling `setTimeout` closures capture the resource's `run` function, preventing GC. A `WeakRef`-based approach would never fire cleanup for a leaked resource with active timers — the exact failure mode we're fixing.
- **Dispose-on-GC with FinalizationRegistry**: More complex, same GC problem as WeakRef; the timer closure prevents GC of the resource.
- **AbortSignal in polling**: Could tie the timer to an `AbortSignal` that fires on `dispose()`/`resetResource()`, but this requires threading a controller through `createPolling` and doesn't address the tracking problem — you still need to know which controllers to fire.
- **Separate process per test file (bun config)**: Would eliminate inter-file state leakage entirely but is a infra-level change with cold-start cost.

## Files

| File | Change |
|---|---|
| `packages/resource/lib/internal/registry.ts` | **Create.** Export `activeResources: Set<{ dispose: () => void }>`, `register(handle)`, `deregister(handle)`. |
| `packages/resource/lib/resource.ts` | Import `register`/`deregister`. Call `register(cleanupHandle)` at the end of the resource factory; call `deregister(sameHandle)` inside the existing `dispose()` implementation. |
| `packages/resource/lib/resetResource.ts` | After `resetCacheState()` and `resetDedupe()`, iterate `activeResources`, call `dispose()` on each, then `activeResources.clear()`. |
| `packages/resource/tests/reset-resource.test.ts` | Add a test: create a resource with an active polling timer, call `resetResource()`, confirm the polling stops (e.g., fetch count does not increment after a delay). |

## Delta

No new public exports. `activeResources` is internal (not in barrel). The `resource()` factory's behavior is unchanged for callers; `resetResource()` becomes stricter.

## Behavioral scenarios

**Test: `resetResource` stops active polling**

```ts
test("stops active polling on reset", async () => {
  let count = 0;
  const r = resource(() => delay(5).then(() => `data-${++count}`), {
    refetchInterval: 20,
    refetchOnKeyChange: true,
  });
  effect(() => { r.status(); });
  await delay(50);
  expect(count).toBeGreaterThanOrEqual(2);

  resetResource();
  const countAfter = count;
  await delay(50);
  expect(count).toBe(countAfter);
});
```

## Definitions of Done

- [ ] `lib/internal/registry.ts` created with Set + `register`/`deregister`
- [ ] `resource()` factory registers into the set; `dispose()` deregisters
- [ ] `resetResource()` iterates the set, calls `dispose()` on each entry, clears it
- [ ] Reset-resource test confirms polling stops after `resetResource()`
- [ ] No existing test regresses (existing disposal path unchanged for normal use)
- [ ] `bun coverage resource` exits 0 on 10 consecutive clean runs
