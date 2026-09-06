---
type: decision
title: "dispatchError does NOT populate context.config — caller must; from a context with no pre-resolved boundary (isDynamic fn(parent)) use resolveErrorConfig(origin), NOT getBoundaryConfig(parent)"
description: dispatchError passes context.config through AS-IS — with no pre-resolved boundary, populate it via resolveErrorConfig(origin), NOT getBoundaryConfig(parent), or error:fallback never renders.
tags: [arch, dom, errors, contract]
timestamp: 2026-07-28
last_confirmed: 2026-07-28
triggers: [dispatcherror-context-config, isdynamic-error-bubble, resolveerrorconfig, error-fallback-config]
---
# Why

Wiring `<Suspense>`'s `.catch` to bubble to error boundaries, the obvious mirror of the reactive-child precedent (`render.ts:253-254`: `dispatchError(toError(e), { phase, element, config: getBoundaryConfig(currentBoundary) })`) is **wrong outside an effect**: isDynamic components (`Suspense`/`Lazy`/`Portal`/`Transition`/`ForEach`) receive only `parent` in `fn(parent)`, with no pre-resolved `currentBoundary`. `getBoundaryConfig(elem)` (`render.ts:22`) peeks **only that one element's** `state.errorConfig` — no walk — so it returns `undefined` for a non-boundary parent (the common case). Passing `config: getBoundaryConfig(parent)` → `context.config` undefined → an `onError` handler doing `ctx.config?.fallback?.(e)` returns `undefined` → **no error UI; the boundary's `error:fallback` never renders** (silent failure). `resolveErrorConfig(origin)` (`dispatch.ts:98`) walks `parentElement` up and returns the first `errorConfig` of any kind — the correct helper when you don't already hold the boundary (it is the semantically-intended `context.config` populator per the dom AGENTS.md error section).

# Evidence

- `packages/dom/lib/internal/dispatch.ts:116` `dispatchError` (uses `context.config` as-is; `findBoundary(context.element)` for the boundary); `:98` `resolveErrorConfig` (walks up); `:55` `toError`.
- `packages/dom/lib/internal/render.ts:22` `getBoundaryConfig` (peeks ONE element's state — no walk); `:253-254` the reactive-child precedent (has `currentBoundary` in scope, so `getBoundaryConfig` is correct THERE).
- `packages/dom/lib/types/nodes.d.ts:52-58` `ErrorContext` (`config?: ErrorConfig` — optional).
- `packages/dom/tests/helpers.ts` `fallbackHandler` (reads `context.config?.fallback`).
- `packages/dom/lib/Suspense.ts` `.catch` uses `resolveErrorConfig(parent)`; verified by the rejection-with-boundary test (`onError` fires, its fallback renders — `hydrate-suspense.test.ts`).

Load-bearing for any future error-bubbling wired from an isDynamic component, or anywhere without a pre-resolved `currentBoundary` in scope.
