## [ ] tests — clarify whether reactive tests need `beforeEach(resetTestState())`
**Type:** Tests

### Depends On
- guide-reactive-state-shared-clarity

### Objective
Every store test file that uses shared reactive globals (`effect`, the reactive graph) follows a single, guide-mandated convention for resetting shared state between tests — either by adding `beforeEach(() => { resetTestState(); })` per the current guide wording, or by an updated guide that explicitly exempts pure reactive tests.

### Solution
The current guide rule is ambiguous for this package: *"Every file that touches shared mutable state uses exactly: `beforeEach(() => { resetTestState(); });`"* — but it defines "shared mutable state" only by example ("DOM/cache/error handlers"). All eight store test files call `effect(...)`, which creates subscriptions in the shared reactive graph that persist across tests in the same file:

- `cleanup.test.ts:46-49`, `cleanup.test.ts:42-62` — `effect` registers a subscription that survives across the cleanup idempotency tests.
- `data.test.ts:76-92`, `data.test.ts:61-74` — multiple `effect` registrations.
- `middleware.test.ts:189-198`, `update.test.ts:135-156`, `update.test.ts:207-249`, `snapshot.test.ts:22-38`, `snapshot.test.ts:40-65`, `nested.test.ts:140-155` — same.

Two outcomes are acceptable, picked by the guide task this depends on:

**Outcome A (guide unchanged):** Add to every store test file:
```ts
beforeEach(() => {
  resetTestState();
});
```
Imported as the global it is (no import statement).

**Outcome B (guide updated to exempt pure reactive tests):** No code change in this task — the exemption is documented in the guide and the store tests are already compliant. Mark this task as completed-by-exemption with a pointer to the guide edit.

The dependency on `guide-reactive-state-shared-clarity` exists because picking the outcome requires the guide to speak first. If the guide task lands as Outcome A, this task becomes mechanical; if Outcome B, this task is a no-op.

Trade-offs: Outcome A adds a microtask-per-test cost (negligible for 67 tests). Outcome B trusts that each test's local `store(...)` and `effect(...)` don't leak; this is currently true but is a footgun for future tests that touch module-level reactive state.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on `packages/store/dist/bundle.js`
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md` is introduced
- [ ] Either every store test file has `beforeEach(() => { resetTestState(); });`, OR `./guides/tests.md` explicitly exempts pure reactive tests from the rule
- [ ] Does the chosen outcome match what `./guides/tests.md` says after the guide task lands?
