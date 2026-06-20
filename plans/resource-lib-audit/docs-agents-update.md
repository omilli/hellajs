## [ ] Update AGENTS.md for new file structure
**Type:** Docs

### Depends On
- Extract internal helpers

### Objective
`packages/resource/AGENTS.md` accurately describes the new `internal/*.ts` file layout, the input-validation behavior change, and the WeakMap-backed dedup map.

### Solution
Update `packages/resource/AGENTS.md`:

**Key Components** section — replace the current three bullets with:
- `resource.ts` — Public `resource()` factory, overload dispatch, signal setup, and fetch orchestration (the `run()` function: cache → SWR → dedup → request → retry phases).
- `cache.ts` — Fetcher-scoped nested cache with global LRU eviction, TTL/staleTime, batch operations, network status.
- `types.d.ts` — Public TypeScript interfaces and type aliases.
- `internal/core.ts` — Barrel re-export from `@hellajs/core` (documented exception to the no-re-export rule).
- `internal/errors.ts` — `isAbortError` type guard and `categorizeError` structured-error mapping.
- `internal/retry.ts` — Retry config resolution (`maxRetries`, `shouldRetry`, `getDelay`) from `retry`/`retryDelay` options.
- `internal/polling.ts` — Recursive `setTimeout` polling with visibility awareness and dynamic interval support.
- `internal/lifecycle.ts` — Window-focus and online/reconnect refetch listeners.
- `internal/dedupe.ts` — `WeakMap`-keyed map of ongoing in-flight requests for deduplication.

**Non-Obvious Behaviors** section — add:
- Public API entry points validate inputs and throw `[resource] fn: <constraint>, received <value>` on invalid input. Previously bad inputs failed late inside `run()` or silently misbehaved (e.g., negative `cacheTime`); they now fail fast at the boundary.
- The dedup map's outer key is a `WeakMap<Function, …>` — entries auto-collect when fetcher functions are garbage-collected. The inner map remains a strong `Map` because cache keys may be primitives.
- `resource()` exposes its reactive state (`error`, `isLoading`, `isFetching`, `isIdle`, `status`) as plain `() => T` thunks rather than `computed()` wrappers — matches core's "arrow getter" idiom and avoids per-instance `ComputedState` allocations.

Do not change the algorithmic sections (SWR, retry, abort handling, LRU eviction) — those describe behavior that this plan does not alter.

### Definition of Done
- [ ] Every code example in the changed sections of `packages/resource/AGENTS.md` compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (this is a package-level concept/architecture document)
- [ ] No claim in the changed sections contradicts the implementation — every file path mentioned exists, every behavior described matches the source
- [ ] The Key Components list mentions every `.ts` file under `packages/resource/lib/` and `packages/resource/lib/internal/`
- [ ] Does `ls packages/resource/lib/internal/` produce a list that exactly matches the `internal/*.ts` files named in the Key Components section?
