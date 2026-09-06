---
type: decision
title: "mount/hydrate attach order: attached → flush() → deferred-region watch — preserve via createMountHandle's afterFlush hook"
description: "The deferred-region watch must start AFTER the handle's flush(): starting it before lets its container MutationObserver see flush-caused mutations; createMountHandle's afterFlush param pins the order."
tags: [arch, dom, hydration]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [afterflush, deferred-watch-order, createMountHandle, hydrate-attach-sequence, mounthandle-scaffolding]
---

# Why

The mount/hydrate attach sequence is order-load-bearing, not incidental: `attachImpl(render) → registerContainer → attached = true → flush() → startDeferredRegionWatch → endMountPhase`. `flush()` (`processMountQueue` + `processCleanupQueue`, `packages/dom/lib/internal/queue.ts`) can itself mutate the container DOM — afterMount hooks run user code, and cleanup removals `removeChild`. `startDeferredRegionWatch` (`packages/dom/lib/internal/hydrate.ts`) installs a live `MutationObserver` on the hydrate container (childList+subtree → `recheckDeferredRegions`), so its position relative to `flush()` is observable in the mid-stream path (`readyState === "loading"`, sentinel-without-template Suspense): started before `flush()`, the observer records flush-caused mutations and re-checks deferred regions on the microtask; started after (current behavior), those mutations are invisible to it.

This bit the mount-handle extraction (plans/dom/code/audit-findings/mount-handle.md, unit #3): the plan's two-arg helper (`attachImpl → attached=true → flush()`) could not also keep the watch between `flush()` and `endMountPhase()` — placing the watch at `attachImpl`'s tail flips it before `flush()`. Resolution (user-approved fork, 2026-09-06): `createMountHandle(container, node, attachImpl, afterFlush?)` in `packages/dom/lib/internal/handle.ts` — the wrapper runs `attached = true; flush(); afterFlush?.()` inside the mount phase, and hydrate passes the watch start as `afterFlush`. Pure-refactor extractions of this sequence must reproduce statement order exactly; the `afterFlush` hook is the seam that makes that possible without duplicating the wrapper.

Companion fact: the scaffolding (`flush`/`unmount` closures, `attached`/`cancelled`/`mountedNodes` state, thenable dispatch, mount-phase bracket) lives in `createMountHandle` — `lib/mount.ts`/`lib/hydrate.ts` hold only container resolution and their `attachImpl`. `attachImpl` returns the root array the handle's `unmount()` iterates (`cleanupSubtree` + `parentNode?.removeChild` each): mount returns `Array.from(container.childNodes)` after `replaceChildren` (a spread fragment root's children all unmount); hydrate returns `[container.firstChild]` on the single-element path and `Array.from(container.childNodes)` on the `$`-root and fresh-mount paths (unit #10, fragment-root-unmount.md, landed 2026-09-06). Bare `Node` values have no `.remove()` — the `ChildNode` mixin methods — so removal on `Node`-typed roots uses `parentNode?.removeChild(n)`.

# Evidence

- `packages/dom/lib/internal/hydrate.ts` — `startDeferredRegionWatch` creates the container `MutationObserver(recheckDeferredRegions)` + body capture replay listener; `hasDeferredRegions()` gates it. Read in full this session.
- `packages/dom/lib/internal/queue.ts` — `processMountQueue` runs `afterMount` hooks (user code) and `processCleanupQueue` → `cleanupSubtree` → `removeChild`: flush-caused DOM mutations are real.
- `packages/dom/lib/internal/handle.ts` — landed wrapper: `beginMountPhase(); try { mountedNodes = attachImpl(resolvedNode); attached = true; flush(); afterFlush?.(); } finally { endMountPhase(); }` (was `rootEl = attachImpl(...)` before unit #10's array model); `packages/dom/lib/hydrate.ts` passes `() => { if (hasDeferredRegions()) startDeferredRegionWatch(container); }`.
- `bun coverage dom` exit 0 after the refactor (423 pass, 99.50% funcs / 100.00% lines — identical to pre-change table); `rg 'const flush|const unmount' packages/dom/lib` → only `internal/handle.ts`.
