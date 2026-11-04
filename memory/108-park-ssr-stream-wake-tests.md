---
title: Park ssr-stream wake tests after the $hs bootstrap; settled-close wake needs a rejecting drain
description: A parked-pull test on ssr.stream must drain through the $hs bootstrap chunk before parking, and only a staged swap that REJECTS while a pull is parked executes the settled-close wake — a healthy append always preempts it by microtask ordering.
tags: [ssr, ssr-stream, backpressure, wake, coverage, ReadableStream, microtask-ordering]
confirmed: 2026-11-03
---
# Why

`ssrStream` has two wake call sites and tests routinely hit the wrong one:

1. The `$hs` bootstrap is enqueued at flush ENTRY — after the main walk's closing tag, before any template. A test that parks after the main walk's `</div>` finds the queue non-empty, so the read resolves immediately from the queue and never parks; the drain must break on `function $hs` (or otherwise consume the preamble) before issuing the parked read.
2. The append wake (inside each drain, after `queue.push(template)`) always consumes a parked pull BEFORE `Promise.all`'s `.then` runs: `wake()` queues the pull continuation first, the drain's return resolves Promise.all second, and the consumer's continuation queues last — so `.then` executes while `wake` is undefined. The `.then` settled-close wake (`settled = true; if (wake) wake()`) therefore fires only when the last-settling drain appends NOTHING — i.e. every still-in-flight staged swap REJECTS (the catch skips the template). The parked read then resolves `{ done: true }` (close), not a template chunk.

Ignoring this: a coverage DoD on the settled-close lines fails with the wake test green and no visible cause, and an append-wake test silently degenerates into a queue-read test.

# Evidence

`packages/ssr/lib/ssrStream.ts` — bootstrap `queue.push` at flush entry (only `if (pending.length)`), per-drain append wake, `Promise.all(...).then(() => { settled = true; if (wake) ... })`, pull parking in `while (queue.length === 0)` with `wake = resolve`. Verified 2026-11-03 by two red `vp run coverage ssr` runs (append-wake test green yet `dist/ssrStream.js` settled-close lines still uncovered) then a rejecting-drain-while-parked test closing the package to 455/455 lines.
