# [x] refactor-run-cleanup

## Contract

### Surface change
no — `run` is internal; all public methods (`fetch`, `invalidate`, `abort`, `mutate`, etc.) keep their exact signatures and behavior. This is purely a structural refactor of the retry-loop exit pattern inside `run`. No exported symbol, type, or signature changes.

### Package
resource

### Guide governance
- `packages/resource/lib/resource.ts` ← `code.md` §Files, §Package File Structure, §Functions/Methods
- No test change — refactor preserves all observable behavior per `tests.md` §When NOT to write tests (existing coverage covers every exit path)
- No doc change

### Files
- `packages/resource/lib/resource.ts` — modify — `run` function (resource.ts:161-322): extract a `settleRun` helper that handles promise resolution/rejection + `deleteOngoing` in one place, then call it from each exit branch

### Public API delta
None — internal-only refactor.

### Behavioral scenarios
None — refactor, all existing 27 test files cover the exit paths.

### Doc placement
None.

### Tests view
Existing tests verify every exit path of `run`: success, abort (pre-fetch, in-catch, during-delay), retry-exhausted error, structural sharing on success, dedup cleanup on all paths. No new test needed per `tests.md` §When NOT to write tests (behavior-preserving refactor).

### Docs view
Not needed.

---

## [x] Refactor run-cleanup (Code)
**Type:** Code
**Depends on:** None

### Strategy
Extract a generic helper `settleRun<R>(settle, value, cacheKey)` local to the `resource()` factory that encapsulates promise-settlement + dedup cleanup. Used at 4 exit branches: success (resolve `T`), abort-in-catch (reject `unknown`), no-retry (reject `unknown`), abort-after-delay (reject `unknown`). The generic `<R>` parameter eliminates the need for a resolve/reject boolean flag — the settle function's type determines the value type, and TypeScript infers correctly. `cacheKey` is passed as a parameter (it's local to `run`, not factory-scoped).

### Definition of Done
- [x] `settleRun` helper extracted in `resource()` factory scope — generic `<R>(settle: (value: R) => void, value: R, cacheKey: unknown) => void`
- [x] All 4 exit branches in the retry loop call `settleRun` (success: resolve shared; abort in catch: reject err; no-retry: reject err; abort after delay: reject DOMException)
- [x] Abort-pre-fetch path (resource.ts:257-259) is unchanged — no promise allocated yet
- [x] No other behavior change — only the repeated pattern is replaced
- [x] `cleanupEffect?.()` call at resource.ts:351 is left alone (not part of this refactor)
- [x] `bun coverage resource` exits 0 (all existing tests pass, 175 pass, 0 fail) — refactor preserved all behavior, coverage 99.73% (unchanged)
