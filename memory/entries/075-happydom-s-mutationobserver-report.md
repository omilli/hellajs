---
type: correction
title: "HappyDOM's MutationObserver report closure is WeakRef-held — macrotask idle before a DOM removal GC-kills delivery (removals then NEVER reported); wait on observer-driven cleanup with microtask-hop polling over peekState"
description: Idle GC kills HappyDOM's WeakRef-held observer closure — never macrotask-wait between staged removals whose cleanup you await (later removals NEVER delivered); poll peekState(root) with delay() hops.
tags: [testing, dom, flaky]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [mutation-observer-delivery, happydom-gc-flake, cleanup-wait, staged-removals]
---
# Why

dom's disconnect cleanup is observer-driven: `remove()` → `containerObserver` callback → `cleanupQueue` → `queueMicrotask(processCleanupQueue)` → `clean()` disposes `componentScope` (unsubscribes effects) then `deleteState` (`lib/internal/queue.ts`, `lib/internal/cleanup.ts`). HappyDOM holds the report closure `(record) => this.report(record)` ONLY via `new WeakRef(...)` — nothing in `MutationObserver` or the node's listener array keeps it strongly referenced (`happy-dom/lib/mutation-observer/MutationObserverListener.js:37`). The deref happens synchronously inside `remove()` (`happy-dom/lib/nodes/node/Node.js:640`): after any GC (forced or idle during macrotask waits), it returns `undefined` and the listener is spliced out (`Node.js:662-666`) — every later removal is silently never reported. The hazard window is idle BEFORE a removal that still needs delivery; post-removal wait granularity is irrelevant. Consequences: `delay(0)` between a test's first and second `.remove()` = probabilistic flake (2/10 standalone runs, `Expected: 2, Received: 3` — trigger fires while effects still subscribed); `delay(10)` polling = deterministic failure (the 500ms idle guarantees GC). Fixed waits cannot fix "never delivered". Microtask-hop polling (`await delay()`) never idles the event loop → no GC window → delivery + cleanup land within a few hops (both microtask-scheduled on the same queue).

Poll target must be the state-carrying element — the component root. `mountNode` creates element state only for `componentScope`/`error`/reactive nodes (`lib/internal/render.ts:154-160`); a removed static wrapper (e.g. `#wrapper-a`) has no state, so polling it is vacuously true at iteration 0 and the race survives.

Distinct from memory 008 (full-suite uncaught `render failed` mode, different signature): this entry root-causes the ISOLATION-mode call-count drift. `ref.test.ts` "auto-clean" keeps its `delay(10)` loop safely for now — its define-poll breaks at iteration 0 (no real idle before the removal) and its removal is the last observer-dependent event — but it sits one real idle away from the same hazard.

# Evidence

- Scratch probes (transient test, deleted after): forced `Bun.gc(true)` between removals → 2nd removal delivered 0/1; 500ms `delay(10)` idle → 0/1; microtask hops (`await delay()`) → 1/1.
- `packages/dom/tests/component.test.ts` converted to microtask-hop polling (6 sites, `peekState` + mirror asserts): 20/20 consecutive standalone runs green (`bun bundle dom && for i in $(seq 1 20); do bun test packages/dom/tests/component.test.ts > /dev/null 2>&1 || exit 1; done`) vs 2/10 failures pre-change; `bun coverage dom` 402/402, coverage at baseline.
- Idiom sanctioned in `guides/tests.md` §Async Tests (added same day, checklist synced).
- Re-confirmed 2026-09-06 on the `e:` direct-handler surface (minor-contracts unit, `direct-events.test.ts` "re-registering e:click on the same element replaces the listener"): a single bare `await delay()` after `btn.remove()` false-fails exactly as the two-hop chain predicts (MO callback microtask + `scheduleCleanup`'s `queueMicrotask`; the wrapped listener still fired post-wait); polling `peekState(btn) === undefined` over `await delay()` hops landed cleanup and the post-removal dispatch fired nothing — poll target was the `directHandlers`-carrying element itself (state-carrying per the Why). `bun coverage dom` exit 0.
