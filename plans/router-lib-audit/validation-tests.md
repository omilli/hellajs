## [ ] Tests for input validation
**Type:** Tests

### Depends On
- Public API input validation

### Objective
The new `router()` and `navigate()` input-validation throw paths are covered by realistic tests that assert the exact error message shape and confirm valid inputs still pass through unchanged.

### Solution
Add a new test file `packages/router/tests/validation.test.ts` (sibling to the existing `errors.test.ts`, `routing.test.ts`, etc.). Follow `./guides/tests.md`: HappyDOM assumed, no `bun:test` internals beyond `describe`/`test`/`expect`, no `any`, no `it.skip`, every test asserts a behavior the source actually exposes. Assume `core` functions are globally available.

`router()` guards:
- `test("router() throws when config is null")` — `expect(() => router(null as any)).toThrow("[router] router: config is required, received null")`. Use `toThrow` with a substring match so the assertion survives minor wording changes but pins the `[router] router:` prefix.
- `test("router() throws when config is undefined")` — same shape, `received undefined`.
- `test("router() throws when config.routes is not an object")` — `router({ routes: "nope" as any })`, expect `[router] router: config.routes must be an object, received string`.
- `test("router() accepts a minimal valid config")` — `router({ routes: { "/": () => {} } })` returns a `RouteInfo` and does not throw. Confirms the guards do not over-fire.

`navigate()` guards:
- `test("navigate() throws when path is not a string")` — `expect(() => navigate(123 as any)).toThrow("[router] navigate: path must be a string, received number")`.
- `test("navigate() throws when path is empty")` — `expect(() => navigate("")).toThrow("[router] navigate: path is required, received empty string")`.
- `test("navigate() accepts a plain string path")` — call within a router-initialized HappyDOM, assert `route().path` updates (or that no throw occurs and history updated). Reuse the existing test setup pattern from `features-nav.test.ts`.

Each `as any` cast here is the deliberate act of passing an invalid runtime value through a typed API — the tests exist precisely to verify the runtime guards that TS cannot enforce. This is the documented exception to the no-`any` test rule (passing invalid input to a validator).

Trade-offs: none. The new behavior from `api-input-validation` is a breaking change with a changeset; these tests lock in the contract.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on the new guard lines in `packages/router/lib/router.ts` and `packages/router/lib/navigate.ts` (name the files and the added line ranges in this Solution when the worker runs coverage)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any` outside validator-input casts, `it()` / `test.skip`, `await tick()` patterns, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the `router` and `navigate` guard implementations
- [ ] Do the validation tests assert the `[router] router:` and `[router] navigate:` message prefixes via `toThrow(...)` substring matches?
- [ ] Does at least one positive test confirm valid input still passes through both `router()` and `navigate()`?
