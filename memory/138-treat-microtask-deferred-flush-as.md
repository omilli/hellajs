---
title: Treat the microtask-deferred flush as macro-bench neutral
description: "A 6-invocation A/B (runs=5, all 8 krausest ops, Chrome 4x throttle) found every per-op delta inside the noise floor: deferred-flush effect scheduling costs nothing measurable, so never attribute macro-bench regressions to the deferral itself."
tags: [core, scheduler, deferred-flush, bench, performance, krausest]
confirmed: 2026-11-12
---

# Why

The sync-flush → microtask-deferred-flush flip (signal writes schedule one
`queueMicrotask` drain instead of flushing at each write) was A/B'd on the
macro-benchmark before merge. Every future flush-scheduler change, package bump,
or perf investigation that touches `packages/core/lib/internal/scheduler.ts`
starts from this baseline: the deferral itself moved nothing beyond noise, so a
measured regression in these ops is the NEW change's, not deferred scheduling's.
Re-litigating sync-vs-deferred on perf grounds is settled by this measurement.

Numbers (avg of 3 invocations x runs=5 per side, medians, ms): create-1k
233.4→240.3 (+6.9), create-10k 2275.5→2245.0 (-30.4, inside the sync side's own
127ms spread), append-1k 252.6→250.9, update-10th 35.7→36.3, clear 45.7→49.7
(+4.0), swap 377.3→357.7 (-19.6, inside overlapping 357-393 / 335-400 spreads),
select 20.0→17.1, remove 67.7→62.1 (-5.6, tight but under the floor). Per the
bench rule (±10ms wobble on inert bundle-byte shifts; the deferred bundle is a
real +273B main.js shift, 57,165 vs 56,892), sub-10ms deltas are unattributable
in both directions, and no delta cleared the attribution floor, so no
inert-bytes control was warranted. Mild directional gains (remove, swap) match
what coalescing should buy but stay unproven.

# Evidence

Measured 2026-11-12: `vp run bench --runs=5 --label=v2-sync-{1,2,3}` on the
main tree at git 569b34dc (sync flush, batch present) vs
`./node_modules/.bin/vp run bench --runs=5 --label=wt-deferred-{1,2,3}` in the
deferred-flush component worktree (same HEAD base, scheduleFlush variant,
batch.ts deleted). All 8 krausest ops, Chrome 155.0.8059.84, throttle 4x,
headless; entries appended to each tree's `.bench/results.md` under those
labels. Averages computed across the three invocations per side.
