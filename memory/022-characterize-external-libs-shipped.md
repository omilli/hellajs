---
title: Characterize external libs from the shipped release channel, not the repo default branch
description: When citing a competitor/reference library's behavior, read the source at the release consumers actually get (npm dist-tag ref), because monorepo default branches carry legacy files that contradict it.
tags: [discovery, external-libs, solid, angular, auto-batching, signals]
confirmed: 2026-12-17
---

# Why

Asserting a library's model from its repo's default branch can be flat wrong: `solidjs/solid@main` still contains the 1.x-style synchronous `packages/solid/src/reactive/signal.ts` (`runUpdates` flushes synchronously at `batch()` exit) while the actually-shipped v2 engine lives in `packages/signals/src/` (`@solidjs/signals`, `next: 2.0.0-rc.15` on npm as of 2026-12-17) and is microtask-scheduled: `schedule()` → `queueMicrotask(flush)` behind a `scheduled` flag, with `flush()` (sync drain) and `flush(fn)` (sync scope via `syncDepth`) as escape hatches. The same check applies to Angular: root effects defer through `ZoneAwareEffectScheduler` ("schedules flushing via the microtask queue", `packages/core/src/render3/reactivity/root_effect_scheduler.ts` on main), view effects run in the sync change-detection tier, and `setRootEffectScheduler` (v20 experimental) is the sync swap. A design conversation grounded on the stale file produced a wrong claim the user had to correct; the fix cost a full re-read at the correct ref.

# Evidence

- `curl https://registry.npmjs.org/solid-js` → `dist-tags`: `latest 1.9.17`, `next 2.0.0-rc.15` (checked 2026-12-17).
- Tag `solid-js@2.0.0-rc.15`, `packages/signals/src/core/scheduler.ts`: `export function schedule() { ... if (scheduled) return; scheduled = true; if (!syncDepth && !globalQueue._running) { queueMicrotask(flush); } }`; public `flush()` docstring: "Reactive updates are normally batched onto the microtask queue... Pass a callback when the writes themselves should bypass microtask scheduling".
- `angular/angular@main`, `packages/core/src/render3/reactivity/root_effect_scheduler.ts`: `ZoneAwareEffectScheduler` docstring "schedules flushing via the microtask queue".
