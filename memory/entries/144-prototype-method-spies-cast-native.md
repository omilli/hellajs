---
type: decision
title: Prototype-method spies cast to the native type at the assignment site, never on the declaration — the declaration-site cast erases `.mock` and fails tsc
description: Cast the spy to the native method type at the prototype-assignment site, never on the declaration — a declaration-site cast erases `.mock` and fails tsc on every `.mock.calls` read.
tags: [tests, contract]
timestamp: 2026-09-15
last_confirmed: 2026-09-15
triggers: [prototype-spy, addEventListener, mock-calls, AbortSignal, call-through]
---
# Why

`mock(function (this: X, ...args: Parameters<X["method"]>) {...}) as unknown as typeof original` on the `const` line gives the variable the native method's type — `.mock` does not exist on it, so the assertion `spy.mock.calls.length` is a TS error. The cast belongs where the type must widen (the prototype assignment); the declaration keeps the inferred `Mock<...>` type. Call-through body (`return original.apply(this, args)`) keeps the code under test functional while the spy counts. Assertion on counts uses `spy.mock.calls.length`, not manual counters (`guides/tests.md` §Anti-Patterns bans pure-integer counters when `mock()` tracks).

# Evidence

`packages/resource/tests/retry.test.ts` scenario "a completed retried fetch leaves no residual abort listeners" (2026-09-15): declaration-site cast → `bun coverage resource` exit 2, 3 TS errors on `.mock` reads; assignment-site cast → exit 0, 264 pass. Precedent shapes: `packages/dom/tests/direct-events.test.ts` (call-through spy), guides/tests.md §Mock Patterns (explicit-generic + `as unknown as typeof X`).
