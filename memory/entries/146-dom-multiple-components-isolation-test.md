---
type: correction
title: dom 'multiple components isolation' test (component-scope.test.ts) is flaky in the full suite
description: dom's 'multiple components isolation' test (component-scope.test.ts, 'dom > component scope') failed once full-suite-only, passing isolated and on re-run — known flake, re-run before investigating.
tags: [testing, dom, flaky]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [flaky-test, full-coverage-failure, dom-component-isolation]
supersedes: 008
---
# Why

A transient full-suite failure of this test is not a regression signal — it passes in isolation and on immediate re-run. The test itself throws nothing: it mounts two effect-scoped components, removes each element, and polls `peekState(el) === undefined` for up to 50 `await delay()` microtask hops (`utils/test-helpers.js`: no-arg `delay()` is `Promise.resolve()`) — that bounded async disposal poll is the plausible cross-suite timing vector. The original 2026-07-10 failure report blamed an uncaught `Error: render failed`; that error could only originate from a different sibling test (`returns empty fragment on render error` in `component.test.ts`, whose `BrokenComp` throw dom routes via `dispatchError`) — cross-test error bleed misattributed to this test. Supersedes 008, which conflated the two tests and cited the pre-split file path and describe path.

# Evidence

- 2026-07-10 run (008's record): full `bun coverage` → 1 fail, `dom > component > multiple components isolation`, uncaught `Error: render failed`; same-session `bun coverage dom` → 0 fail; same-session full re-run → 0 fail.
- Current tree: the test lives in `packages/dom/tests/component-scope.test.ts` under `describe("component scope")` — moved out of `component.test.ts` by cf6c4293 (2026-09-10). Its body is two scoped components + `peekState` disposal polls; no `BrokenComp`, no error dispatch. At 008's writing (state 21afb872, 2026-06-29) it had the same no-throw shape, in `component.test.ts`.
- `Error: render failed` appears in exactly one dom test: `component.test.ts` `returns empty fragment on render error` (`BrokenComp`); `packages/dom/lib/component.ts` routes that throw through `dispatchError`.
- 2026-09-16: `bun coverage dom` → 464 pass / 0 fail; `dom > component scope > multiple components isolation` passes in isolation.
