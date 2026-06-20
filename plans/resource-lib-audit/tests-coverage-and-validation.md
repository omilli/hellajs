## [ ] Tests for validation and refactor coverage
**Type:** Tests

### Depends On
- Replace computed-as-readonly with plain thunks
- Public API input validation
- WeakMap-keyed deduplication map

### Objective
Test coverage for `@hellajs/resource` is at 100% on the changed source lines, and every new input-validation guard has a test asserting the exact `[resource] fn: …` error.

### Solution
Add `packages/resource/tests/validation.test.ts` covering each guard added by the `public-api-validation` task. For each guard, assert both that an `Error` is thrown and that its `message` starts with the expected `[resource] fn:` prefix and includes the `received <value>` suffix.

Cases:
- `resource(null as unknown as string)` → `[resource] resource: fetcher must be a string URL or function, received object`
- `resource(123 as unknown as string)` → `… received number`
- `resource(async () => 1, "bad" as unknown as undefined)` → `[resource] resource: options must be an object, received string`
- `resource(async () => 1, [] as unknown as undefined)` → `… received object` (array rejection)
- `r.setData(undefined as unknown as never)` → `[resource] setData: updater is required, received undefined`
- `resourceCache.set("k", "v", -1)` → `[resource] set: cacheTime must be a non-negative number, received -1`
- `resourceCache.set("k", "v", "x" as unknown as number)` → `… received x`
- `resourceCache.set("k", "v", 0, -5)` → `…staleTime…`
- `resourceCache.setConfig("bad" as unknown as never)` → `[resource] setConfig: config must be an object, received string`
- `resourceCache.update("k", undefined as unknown as never)` → `[resource] update: updater is required, received undefined`
- `resourceCache.updateMultiple([{ key: "k", updater: undefined as unknown as never }])` → atomic rejection (no inner map mutated)

Use `as unknown as …` for type-narrowing at the call site — never `any` (per `./guides/tests.md`). Use real fetcher stubs (`async () => 1`), never `jest.fn`/`vi.fn`. No `test.skip`, no boolean-flag call counters, no `await tick()` without a `0` argument.

Coverage regression — run `bun coverage` before and after the refactor (the worker takes the "before" snapshot at task start). Confirm 100% coverage on:
- `packages/resource/lib/resource.ts` (or its post-extract line range)
- `packages/resource/lib/internal/errors.ts`, `retry.ts`, `polling.ts`, `lifecycle.ts`, `dedupe.ts`
- All newly added validation branches

If existing tests don't reach a refactored helper, add the minimum integration test that does — through the public `resource()` surface, never by importing internal symbols (per project testing guidelines).

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (named in Solution: `resource.ts`, `internal/errors.ts`, `internal/retry.ts`, `internal/polling.ts`, `internal/lifecycle.ts`, `internal/dedupe.ts`, plus all new validation branches)
- [ ] Overall coverage for `@hellajs/resource` is not lower than the "before" snapshot taken at task start
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation in `packages/resource/lib/`
- [ ] Does `rg "\[resource\]" packages/resource/tests/validation.test.ts` find assertions for every guard message produced by the source?
