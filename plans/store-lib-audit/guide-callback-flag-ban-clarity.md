## [ ] guide — extend boolean-flag ban to cover "callback was called" tracking
**Type:** Docs

### Depends On
- None

### Objective
`./guides/tests.md`'s boolean-flag ban unambiguously covers tracking whether a callback (cleanup hook, lifecycle hook, error handler) was invoked, so the pattern stops spreading through cleanup/lifecycle/error tests across packages.

### Solution
The current rule in `./guides/tests.md` § Anti-Patterns reads:
> Never use boolean flag patterns (`let called = false`) or pure integer counters (`let runs = 0`) for call tracking — use `mock()` instead. The only exception is a counter incremented inside a callback that also performs observable side effects [...].

The literal example is `let called = false`, but audits keep finding the same anti-pattern in mutated form: `let cleaned = false`, `let nestedCleaned = false`, `let handlerCalled = false`, `let errorOccurred = false`, `let asyncCompleted = false`. Each of these is "track whether a callback fired," which is exactly what `mock(() => {})` + `toHaveBeenCalledTimes(n)` is for. The current wording lets the pattern slip past review when the flag name is not literally `called`.

Extend the rule with one sentence that names the mutated forms. Reference the general principle (any boolean that flips inside a callback and is later asserted on is a call tracker), not specific package code.

Proposed addition to the existing bullet:
> This includes flags with semantically renamed variables (`let cleaned = false`, `let handlerCalled = false`, `let errorOccurred = false`, `let asyncCompleted = false`) — any boolean that flips inside a callback and is later asserted on is a call tracker and must use `mock()`.

The same gap allowed the pattern to land in `router/tests/errors.test.ts` (5 occurrences), `router/tests/routing.test.ts` (2), `router/tests/hooks.test.ts` (2), `resource/tests/mutations.test.ts` (2), `core/tests/reactive.test.ts` (1), and `store/tests/cleanup.test.ts` + `nested.test.ts`. Codifying the rule prevents recurrence; the existing occurrences are fixed package-by-package.

Trade-offs: none. The rule's intent is already clear; this edit closes the renaming loophole.

### Definition of Done
- [ ] Every code example in the changed docs compiles against current source signatures
- [ ] No claim in the changed docs contradicts the implementation
- [ ] Does `./guides/tests.md` § Anti-Patterns contain a sentence that names the renamed-flag forms (`cleaned`, `handlerCalled`, `errorOccurred`, `asyncCompleted`) and states the general principle?
- [ ] Does the added sentence avoid referencing explicit package source code beyond the variable-name examples?
