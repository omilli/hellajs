---
type: correction
title: Registry dismissal tests assert the onClose mock because components never flip the caller's signal — dispatched-event signal writes propagate synchronously
description: Dismissal tests assert the onClose mock (components only notify; the caller owns the signal flip), not because dispatch-scoped writes stall — core flushes unbatched writes synchronously.
tags: [testing, ui, signals, events]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [dismissal-test, event-dispatch-signal, esc-close-test, drag-dismiss-test, exit-animation-test, modal-test-pattern, signal-flush]
supersedes: 191
---
# Why

The delivered shape in `packages/ui/tests/dialog.test.ts` and `drawer.test.ts` stands, for the right reason: dismissal tests dispatch Escape/drag-release/outside and assert the `onClose` mock only; `data-state`, exit-transform, and unmount assertions follow a test-scope `open(false)`. The justification is the component contract — `dialog.tsx`/`drawer.tsx` wire `onEscape`/`onOutside`/`onDrag` to `props.onClose` and never write the `open` signal themselves (drawer.test.ts: "The caller's onClose wires the signal flip (the component never flips it)"). A bare `mock()` writes no signal, so `data-state` legitimately stays `"open"` — assert the wiring, then flip test-scope for DOM-state assertions.

What breaks if the old claim is kept: entry 191 attributed this shape to stalled propagation — "signal writes from inside dispatched events never propagate", "waiting does not help". That mechanism is false and misleads anyone recalling it: it forbids a pattern that works (writing the signal inside an `onClose` that a dispatch fires) and paints a wrong model of the scheduler.

# Evidence

Re-probed this session against the current stack: mounted all four compiled dialog variants (jsx/css, html/css, jsx/tailwind, html/tailwind) with `onClose: () => dlg.open(false)` — the write made inside the dispatched Escape handler — dispatched Escape on the portal-mounted panel: `data-state` flipped to `"closed"` synchronously (`sync=closed microtask=closed after50ms=closed` on all 4; probe file deleted after). Source: `packages/core/lib/signal.ts` (`!batchDepth && flush()` — synchronous effect flush on every unbatched write), `packages/core/lib/batch.ts` (flush in `finally` when depth reaches 0 — still synchronous), `packages/dom/lib/onEscape.ts` (plain synchronous keydown listener). The scheduler last changed 2026-09-10 (`git log -1 -- packages/core/lib/internal/scheduler.ts`), before entry 191's 2026-09-22 confirmation — the misdiagnosis predates this correction, not a later regression.
