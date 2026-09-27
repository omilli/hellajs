---
type: correction
title: "ElementState exists only on nodes that registered it (hooks, refs, observers): a hook-less component root never gains state, so peekState(el)?.isMounted polls must target the element carrying the hook:, not the component root"
description: peekState returns undefined forever for hook-less elements — mount-wait and cleanup polls must pass the element that owns the hook: wiring, never the component root.
tags: [testing, dom, lifecycle, contract]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [peekstate-poll, ismounted-test-wait, aftermount-test, component-test-harness, awaitwiring-helper]
---
# Why

Tests that await mount wiring (or observer-driven cleanup) poll `peekState(el)?.isMounted`. Passing the component's root element silently never resolves when the root carries no `hook:` attributes: the root has NO ElementState at all, so the poll either spins out or (in a cleanup wait) breaks at iteration 0 while the real hook element is still tearing down. `processMountQueue`'s walk (`packages/dom/lib/internal/queue.ts`) skips any node without existing state (`const state = peekState(n); if (!state) return;`) — state is created only where something registered it (`hook:` attributes, refs, observers). Entry 035's "root included" holds only when the root itself carries state; for hook-less roots (e.g. a composed wrapper div) the hook-carrying child is the poll target. Observed cost: a scroll-area test suite's first `awaitWiring(root)` failed all 50 microtask hops until re-targeted at the bar element that owns `hook:afterMount`.

# Evidence

Probe against compiled registry output (this session): after mount, `peekState(root)` → `undefined` (ScrollArea root, hook-less), `peekState(bar)?.isMounted` → `true` (bar owns `hook:afterMount`), viewport → `undefined`. Source: `packages/dom/lib/internal/queue.ts` `processMountQueue` (`if (!state) return;` before the `isMounted` write); `packages/dom/lib/internal/state.ts` `peekState` (raw `elementMap.get`, no creation). Fix that worked: `packages/ui/tests/helpers/variants.ts` `awaitWiring(stateEl)` takes the hook-carrying element; `packages/ui/tests/scroll-area.test.ts` passes the scrollbar, all 37 tests green; `bun coverage ui` exit 0.
