---
type: decision
title: GC canaries over signal-held values must commit the superseded slot — clear reactive sources while subscribers still live
description: "A writable signal's sbv keeps the superseded value until a read commits it; with no live subscriber, closures referencing the signal pin the old value — clear reactive sources while subscribers live."
tags: [testing, core, memory-leak, gc]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [weakref-gc-test, signal-value-pin, gc-canary-flake, lazy-sbv-commit]
---
# Why

`signal(value)` writes `sbc` + DIRTY and propagates only `if (rs)`; `sbv` (the last committed value) is replaced only by `executeSignal` on the getter path (`packages/core/lib/signal.ts` setter/getter, `packages/core/lib/internal/execution.ts` `executeSignal`). After the last subscriber is disposed, a set writes `sbc` and never commits — `sbv` keeps the OLD value indefinitely. Meanwhile a still-mounted reactive getter (or any live closure) references the signal itself, so the signal — and its stale `sbv` array — stays reachable. A `WeakRef` canary on an item inside that old array then never collects, regardless of the component fix under test. Extends memory 064 (drop refs → `await delay(0)` → `Bun.gc(true)`×3): 064's protocol is necessary but not sufficient when the canary rode a signal value.

# Evidence

Verified 2026-09-10 (dom audit 01-dynamic-anchor-ownership, probe variants A/B/C/D/E/F2/F3/H/Q/Q2/R1-R3, since deleted): switch-away-then-`items([])` retains the canary through getter-closure → signal → `sbv` → old array (B/C/P/Q retained ×3 runs each); clearing the list while the component's effect still subscribes commits `sbv` (the effect's read) and the same canary collects deterministically (H, 3/3); disposing the outer effect also collects (F2/Q2 — the closure pin dies with it). Source: `signal.ts` (`sbc` write precedes the `rs` check; getter commits via `executeSignal`), `execution.ts:executeSignal` (sbv ← value). Canonical shape: `packages/dom/tests/reactive-dynamic-children.test.ts` "ForEach switch-away releases item objects held only by the list collections" (clear-while-mounted order + comment).
