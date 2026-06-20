## [ ] Extract internal helpers
**Type:** Code

### Depends On
- In-place style fixes

### Objective
`packages/resource/lib/resource.ts` is under 300 lines, with cohesive helper groups moved into new modules under `lib/internal/`.

### Solution
Move non-orchestration helpers out of `resource.ts` into new internal modules. `run()` stays in `resource.ts` per scope decision (the user chose "Extract helpers to internal/" over "Extract + split run()"). Public API surface, runtime behavior, and the `Resource<TTransformed, T>` contract are unchanged.

Proposed splits (each new file gets a module-level comment plus JSDoc on every export; symbols not re-exported by `index.ts` get `@internal`):

- `internal/errors.ts` — exports `isAbortError` type guard and `categorizeError`. Currently at `resource.ts:10` and `resource.ts:604`. Self-contained, no dependency on factory state.
- `internal/retry.ts` — exports `resolveRetryConfig` plus a local `RetryConfig` interface. Currently at `resource.ts:140`. Takes the destructured `retry`/`retryDelay` options as input and returns `{ maxRetries, shouldRetry, getDelay }`.
- `internal/polling.ts` — exports `createPolling` returning `{ setup, clear }`. Wraps `clearPolling`/`setupPolling` plus the recursive `scheduleNext`/`executePoll` closures (`resource.ts:155–206`). Takes the polling-related options and a `run` callback; checks `hasDocument()` internally for visibility.
- `internal/lifecycle.ts` — exports `createFocus` and `createReconnect`, each returning `{ setup, clear }`. Wraps `clearFocus`/`setupFocus`/`clearReconnect`/`setupReconnect` (`resource.ts:208–243`). The reconnect helper uses `resourceCache.onOnlineChange` from `./cache`.
- `internal/dedupe.ts` — exports `ongoingRequestsMap` plus `getOngoing`, `setOngoing`, `deleteOngoing` helpers used by `run()`. Currently inlined in `resource.ts:8` and scattered across `run()` body. Type of outer key and weak-vs-strong is handled by the `dedupe-weakmap` task; this task only moves the structure as-is.

The factory stays focused on: overload signatures, options destructuring, signal creation, transform computed, `run()` orchestration (cache/SWR/dedup/retry/abort phases), `abort`/`invalidate`/`setData`/`mutate`/`reset`/`dispose`/`status`/`cacheKey` definitions, and the public return object.

Trade-offs: closures that capture factory state (e.g., `currentAbortController`, `rawData`, `isLoading`) cannot move cleanly — the polling/lifecycle helpers must accept callbacks. The factory-created `createPolling({ refetchInterval, refetchIntervalInBackground, run })` pattern preserves encapsulation without exposing state. Verify no `// eslint-disable` comments survive the move.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] `wc -l packages/resource/lib/resource.ts` reports ≤ 300
- [ ] Every new or changed exported symbol has JSDoc (`@internal` on helpers not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — `Resource<TTransformed, T>` interface and observable runtime behavior unchanged
- [ ] Audit skill run on `packages/resource/lib/` (all files, including new `internal/*.ts`) reports no deviations from `./guides/code.md`
- [ ] Does `ls packages/resource/lib/internal/` list `core.ts`, `errors.ts`, `retry.ts`, `polling.ts`, `lifecycle.ts`, `dedupe.ts`?
- [ ] Does `rg "function (run|abort|invalidate|setData|mutate|reset|dispose|status|cacheKey|resource)" packages/resource/lib/resource.ts` confirm only the orchestration functions remain in `resource.ts`?
