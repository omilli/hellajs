---
type: correction
title: Core auto-GC drains every computed dependency with cascading removeLink — probe retention with WeakRef canaries riding the computed's return value, never a dead expression
description: Probe graph retention with a canary in the computed's closure AND return value, sources alive, ≥2 Bun.gc(true) passes — removeLink's GC branch now drains all deps and cascades into dep computeds.
tags: [core, testing, memory-leak, reactive-graph]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [core-leak-test, weakref-canary, computed-auto-gc, retention-probe, removeLink-gc-cascade]
supersedes: 039
---
# Why

The WeakRef canary technique (inherited from superseded memory 039) still holds: (1) **dead-expression false negative** — a bare `held;` statement in the computed body contributes nothing to the result and optimizes out, so the canary collects even when the node leaks; it must flow into the observable output (`return { sum: a() + b(), tag: held }`) so `cbc` genuinely retains it. (2) **Premature collection** — keep the source signals alive in outer scope (they are the roots that retain a leaked node via `rs` subscriber lists) and drop only the computed's subscriber by stopping the effect; run ≥2 (canonical: 3) `Bun.gc(true)` passes before `deref()`, since one pass can leave weak targets un-swept.

**Corrected fact (039's evidence is stale):** the 2026-08-21 `removeLink` bug — GC branch removed only the first dep link (`ls.rd = removeLink(ls.rd, ls)`), leaving deps 2..n attached and retaining the multi-dep computed — was fixed the same day in `67d7851c`. The GC branch now type-dispatches on `COMPUTED` and drains ALL outgoing dependencies in a `while` loop that cascades into dep computeds losing their own last subscriber (mirrors `disposeEffect`'s loop). A multi-dep computed after last-subscriber dispose no longer retains; 039's differential shape ("known-leaky graph retains, known-clean collects") is retired — there is no leaky anchor left. A retained canary in a retention probe now means either the capture was shaped wrong (optimization artifact) or a genuine leak — re-derive against `links.ts` before claiming a leak, and contrast against the current passing tests rather than a synthetic leaky control.

# Evidence

- Source: `packages/core/lib/internal/links.ts` `removeLink` GC branch — `if (ls.rf & COMPUTED) { ls.rf = WRITABLE | COMPUTED | DIRTY; let dep = ls.rd; while (dep) dep = removeLink(dep, ls); }` ("Drain ALL outgoing dependencies; cascades…"). Bug state confirmed at `67d7851c~1`; fixed in `67d7851c` (2026-08-21, "chore: core optimizations"). Mechanics intact: `computed.ts` `cbc`/`cbf`; `effect.ts` cleanup → `scheduler.ts` `disposeEffect` → `removeLink` per dep.
- Tests: `packages/core/tests/computed.test.ts` "computed auto-GC releases every dependency for multi-dependency computeds" and "computed auto-GC cascades dependency release into inner computeds" — canary in the returned value, effect `stop()`, `Bun.gc(true)`×3, `deref()` undefined; inline comments restate both failure modes (dead statement optimizes out; single pass insufficient). The old retention expectation would fail these tests.
