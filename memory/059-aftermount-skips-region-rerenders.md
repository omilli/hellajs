---
title: "hook:afterMount fires only on the mount walk, portal reconstruction, and already-connected registration - never for nodes a reactive region re-render inserts"
description: "dom's afterMount delivery paths are the initial mount walk, Portal's explicit queueMountWalk, $ref triggers, and the already-connected branch in addHook; nodes inserted by a plain reactive region's re-evaluation ({() => ...} thunks swapping children) get no walk, so any per-mount registration riding hook:afterMount silently loses state on the first data-driven re-render."
tags: [dom, hooks, reactive-regions, portals, headless]
confirmed: 2026-10-29
---
# Why

`dom`'s afterMount delivery has exactly four paths: (1) the initial `mount()`/`hydrate()` walk over the root subtree; (2) `Portal`'s explicit `queueMountWalk` for content inserted into the unobserved remote target; (3) `$ref` mount processing; (4) `addHook`'s immediate fire when the node is already connected at registration. A reactive region (`runReactiveChild` in `packages/dom/lib/internal/render.ts`) that re-evaluates and swaps its children inserts the new nodes with plain `insertBefore` - the scoped MutationObserver reports the addition for cleanup/overlay purposes, but no mount walk runs over it, so `hook:afterMount` on the inserted subtree never fires.

Consequence for factories whose parts render through data-driven regions (command's `List` re-rendering the ranked body per keystroke): per-item wiring registered in `hook:afterMount` (event-handler registries, node-keyed state) is missing for every node created after the initial mount. Registration must happen at part-call time (render time) instead, keyed by value with commits gated through the live roster so stale entries are unreachable; node-keyed WeakMaps dismount cleanly but value-keyed Maps populated at call time are the shape that survives re-renders.

# Evidence

Minimal repro (probe, this session): a region thunk flipping between two hooked divs logs afterMount for the initial side only - `which("b")` inserts the hooked B div and no hook fires. Source: `packages/dom/lib/features/hooks.ts` (`queueMountWalk`, `collectAdded`, `addHook`'s already-connected branch, `processMountQueue`'s idempotent walk) and `packages/dom/lib/internal/render.ts` `runReactiveChild` (insertBefore without a walk). Empirical fallout: headless `command.tsx` Enter-commit lost the active item's handler after the first ranked re-render until the commit registry moved from mount-time hooks to render-time population.
