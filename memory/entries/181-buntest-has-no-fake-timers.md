---
type: decision
title: bun:test has no fake timers; time-dependent tests use real small delays plus the Date.now mock closure
description: Plans citing a jest-style fake-timer/setSystemTime tick pattern are wrong for bun test; the guide's sanctioned tools are real-time `delay(N)` waits and the Date.now mock closure.
tags: [testing, bun]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [fake-timers, hover-intent, delay-test, skip-delay, timer-test]
---
# Why

`bun:test` exposes `jest.useFakeTimers` but no way to advance the fake clock; `setSystemTime` freezes clock readings (`Date.now()` and `new Date()`) and never advances real `setTimeout` scheduling. A timer-dependent behavior test (open/close delays, skip-delay windows) authored against a fake-tick pattern fails or hangs. The working shape: pass small real delays in the options (`openDelay: 5`), assert synchronously where the contract is synchronous, `await delay(30)` for timer-driven transitions, and mock `Date.now` with the describe-scoped closure (`originalNow` saved in `beforeEach`, restored in `afterEach`, `now +=` advanced in-body) when a wall-clock window must move deterministically.

# Evidence

`guides/tests.md` §Mock Patterns (Date.now closure) and §Async Tests (`delay(N)` real-time waits) are the guide's only time patterns — no fake-timer section exists (grep). Empirical: `bun -e` with `Date.now` mocked showed a 5ms real `setTimeout` still firing on the real clock while `Date.now()` stayed frozen. Applied in `packages/dom/tests/hoverintent.test.ts` (8 passing tests, skip-delay window driven by `now += 100` / `now += 600`); found when unit 01 of plans/ui/code/ui-shadcn-components cited a nonexistent "setSystemTime/tick pattern per existing tests guide". Re-confirmed 2026-09-19 while executing unit 15 of the same set (which again cited fake timers): `Object.keys(jest)` exposes `useFakeTimers` but NO `advanceTimersByTime`/`runAllTimers`, so the fake clock cannot be advanced — injected short durations plus real `delay` waits remain the only pattern (sonner duration tests).
