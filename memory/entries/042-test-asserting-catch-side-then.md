---
type: decision
title: A test asserting the CATCH side of a `.then(fn).catch(fn)` chain on an ALREADY-REJECTED promise must wait past TWO microtask hops — a single `await delay()` resumes the test before the catch runs and false-fails
description: An already-rejected .then(f).catch(g) chain needs TWO microtask hops — one await delay() lands between them and false-fails (the resolve twin stays green); use await delay(N), never a double delay().
tags: [testing, async, microtask, bun-test]
timestamp: 2026-08-21
last_confirmed: 2026-08-21
triggers: [catch-assertion-too-early, sync-rejected-promise-chain, microtask-hop-count, delay-insufficient]
---

# Why

The promise chain's topology sets the tick count: `.then(f)` on an already-rejected promise queues f as a microtask; f's rejection then queues `.catch(g)` as a SECOND microtask. `await delay()` schedules the test continuation as one microtask — landing between the two. tests.md bans the double-delay (`await delay(); await delay()`) even here — the sanctioned alternative is `await delay(N)` (real-time wait, macrotask boundary), which also absorbs any thenable-resolution hops. Sibling knowledge: memory 016 (an unawaited `.rejects` matcher false-PASSES) is the inverse trap — this one false-FAILS a correctly-written handler assertion.

# Evidence

Empirical isolation, 2026-08-21 (scratch diagnostic, since deleted): sync-rejecting child + `await delay()` → handler calls 0, fallback still in DOM; the same setup + three `await delay()` hops OR `await delay(50)` → handler calls 1, fallback cleared. Fixed test: `packages/dom/tests/hydrate-mismatch.test.ts` "bubbles a degradation rejection to onError and drops the fallback" (uses `await delay(50)`, green in `bun coverage dom` 357/0).
