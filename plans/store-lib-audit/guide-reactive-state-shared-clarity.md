## [ ] guide — clarify whether reactive effects count as shared mutable state
**Type:** Docs

### Depends On
- None

### Objective
`./guides/tests.md` gives an unambiguous answer to "does a test file that only calls `effect(...)` (no DOM, no cache, no error handler) need `beforeEach(() => { resetTestState(); })`?", so future audits stop disagreeing about it.

### Solution
The current rule in `./guides/tests.md` § Setup and Teardown reads:
> **Every file that touches shared mutable state** uses exactly:
> ```typescript
> beforeEach(() => {
>   resetTestState();
> });
> ```
> **Files with zero shared mutable state** (pure logic, no DOM/cache/error handlers) skip it entirely.

The phrase "shared mutable state" is defined only by example ("DOM/cache/error handlers"). The store package's tests call `effect(...)` extensively — every effect registers a subscription in `@hellajs/core`'s shared reactive graph. Whether that counts as "shared mutable state" determines whether eight test files need a `beforeEach` they currently lack. The `core` package's own tests (`packages/core/tests/reactive.test.ts`) also lack the reset, so the codebase has already voted "no" — but the guide has not said so.

Pick one of two outcomes and edit the guide to state it explicitly. Reference general reactive-system principles only — do not name explicit package code beyond the existing `@hellajs/core` mentions already in the guide.

**Outcome A — reactive graph counts as shared state.** Add a sentence to § Setup and Teardown:
> The reactive graph (`signal`, `computed`, `effect`, `scope`) holds subscriptions in module-level state that persists across tests. Any file that calls `effect(...)` therefore touches shared mutable state and must use the `beforeEach(resetTestState())` reset.

**Outcome B — per-test local reactive state is exempt.** Add a sentence:
> A test that creates its own `signal`/`store`/`effect` inside the `test(...)` body does not touch shared mutable state by itself — each test's subscriptions are local. The reset is required only when a test reads or writes module-level reactive singletons (a package's internal state maps, global error handlers, DOM observer registries).

Outcome B matches the codebase's current behavior; Outcome A matches the literal reading of the existing rule. Either is fine; pick one and write it down.

Trade-offs: Outcome A adds a `beforeEach` to every reactive test file in every package (mechanical churn, small per-test cost). Outcome B trusts future test authors to know the difference between local and module-level state — the gap that allowed the ambiguity in the first place.

### Definition of Done
- [ ] Every code example in the changed docs compiles against current source signatures
- [ ] The correct template from `./guides/docs.md` was used (this is a guide edit — N/A)
- [ ] No claim in the changed docs contradicts the implementation
- [ ] Does `./guides/tests.md` § Setup and Teardown contain an explicit sentence stating whether per-test `effect(...)` calls count as shared mutable state?
- [ ] Does the chosen outcome match what `packages/store/tests/` actually does after the `tests-reactive-state-reset.md` task lands?
