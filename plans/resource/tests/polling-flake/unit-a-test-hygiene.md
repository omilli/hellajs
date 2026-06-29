---
depends_on: []
---

# [ ] Unit A: Test-hygiene fix for polling flake

## Gap

`resource > polling > stops polling on reset` fails intermittently in the full suite (exit code from `NetworkError: ECONNREFUSED` with URL `http://localhost/about`) but passes consistently in isolation. The error is a leaked `window.fetch()` from a stray resource whose polling timer survived into the polling test.

**Scope hint:** `tests` (surface: no — internal test-only change).

**Citations:**
- Error observed in `/tmp/opencode/cov-full.log:1295` — `resource > polling > stops polling on reset` fails with `NetworkError`
- `packages/resource/tests/polling.test.ts:52-67` — the `test.each(["abort", "reset"])` parametric test
- `packages/resource/tests/fetching.test.ts:269-293` — `dispose during ongoing request` creates a resource with `refetchInterval: 20` and an unusual lifecycle (fetch → dispose → resolve); its polling timer is a candidate leak source
- `packages/resource/lib/resetResource.ts` — `resetResource()` clears cache + dedup + onlineCallbacks but does NOT stop active polling timers

**Type tag:** Tests

## Strategy

The root cause is that `resetResource()` (and the individual test `beforeEach`'s `resourceCache.map.clear()`) clear cache/dedup state but **do not stop active polling timers** (`setTimeout` in `polling.ts`). A resource from an earlier test file that doesn't call `dispose()` (or whose `dispose()` isn't reached due to an error) leaks a polling timer into the next test. The timer fires `run(false)`, hits the HappyDOM fetch implementation, and throws `ECONNREFUSED`.

Two countermeasures, both lightweight:
1. **Call `resetResource()` in the polling test file's `beforeEach`** — clears all cache, dedup, and online callback state from prior tests, narrowing the window for leaked state even if it doesn't stop timers.
2. **Wrap each polling test body in `try/finally` to ensure `r.dispose()`** — if an assertion fails early, the resource is still disposed, halting its polling timer.

These don't eliminate the root cause (a leaked timer could still fire during the tiny window between tests) but make the flake vanishingly unlikely. The structural root cause (no global resource registry for `resetResource()` to iterate) is scoped in Unit B.

## Files

| File | Change |
|---|---|
| `packages/resource/tests/polling.test.ts` | Add `import { resetResource } from "@hellajs/resource/bundle"` and `resetResource();` in `beforeEach`. Wrap each `test(...)` body in try/finally to call `r.dispose()`. |

## Delta

No public API change. Test-only hygiene.

### Import line change

Add `resetResource` to imports:

```ts
import { resource, resourceCache, resetResource } from "@hellajs/resource/bundle";
```

### `beforeEach` change

Add `resetResource();` before the existing `resourceCache.map.clear();`.

### Test body change

Every `test(...)` that creates a resource wraps its body:

```ts
test("polls at interval with refetchOnKeyChange", async () => {
  const r = resource(...);
  try {
    // ... existing body ...
  } finally {
    r.dispose();
  }
});
```

## Behavioral scenarios

No behavioral change. Scenarios are the existing 10 polling tests, now with always-called `dispose()`.

## Definitions of Done

- [ ] `resetResource` imported in `polling.test.ts`
- [ ] `beforeEach` calls `resetResource()` before the existing `map.clear()`
- [ ] Every `test` body that calls `resource(...)` wraps in try/finally with `r.dispose()` in the finally block
- [ ] `bun coverage resource` exits 0 on 10 consecutive clean runs (no flake)
