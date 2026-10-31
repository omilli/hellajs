---
title: Probe core signal write semantics before reasoning about reactive behavior preservation
description: "Signal writes equality-gate on pendingValue (not currentValue) and flush immediately outside batches — including writes made inside effect bodies — so back-to-back writes to one signal each run a real propagation cycle; never assume a write pair is batched into one."
tags: [core, signal, scheduler, flush, batch, effect, propagation, behavior-preservation]
confirmed: 2026-10-31
---
# Why

Behavior-preservation analysis over reactive seams (extracting a shared machine from hand-copied factory closures) lives or dies on what a signal write actually does. Three verified properties of core decide it:

1. The setter's equality gate reads `signalNode.pendingValue`, not `currentValue` (`packages/core/lib/signal.ts`). Two writes in one tick compare against the previous write's staged value, so `visible(false); visible(true)` runs BOTH branches (neither is a no-op) whenever the values differ from the staged predecessor.
2. Outside a batch, each write calls `propagate` then `flush()` immediately (`!batchDepth && flush()`) — and effect bodies are NOT wrapped in a batch (nothing in the scheduler's `executeEffect` sets `batchDepth`), so a write inside a running effect propagates and flushes to completion before the effect's next line runs. A `false` write from inside an effect really unmounts a render-gated subtree before the following `true` write remounts it.
3. A second write to the same signal within one flush dirt-marks the already-queued consumer without re-queueing (the `WATCHING`-bit dedup in `notify`) — but that only collapses work when the consumer has not flushed yet; property 2 means it already has.

What breaks if ignored: a "these two copies are behaviorally identical" claim can be silently wrong in an edge (e.g. reopen-mid-exit keeping vs. recreating a DOM node) that static reading of the surviving variant hides, and a test pins the difference. Predict the behavior from these three properties, then verify with a probe — a temporary variant swap plus the targeted test file — before unifying divergent copies.

# Evidence

Read this session (2026-10-31): `packages/core/lib/signal.ts` setter block (equality gate on `pendingValue`), `packages/core/lib/internal/scheduler.ts` (`notify` WATCHING dedup, `executeEffect` with no batch wrapping, `flush` drain). Empirical probe: swapping the navigation-menu exit machine's open branch from the clear-then-`visible(true)` shape to the `finishExit(); visible(true)` shape flipped `navigation-menu.test.ts` "a reopen mid-exit dismisses the fallback and keeps the panel mounted" red (`content.isConnected` false at the first assert) — the `visible(false)` write detached the held node exactly as properties 1+2 predict; reverting the swap went green again.
