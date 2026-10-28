---
title: "Treat registry.addEffect bodies as void: capture teardown via beforeDestroy hooks, not cleanup returns"
description: "A body passed to dom's registry.addEffect can never return a cleanup — the hooks-feature wrapper drops the return — so node-scoped teardown registers registry.addHook(node, \"beforeDestroy\", …) or holds handles in a closure the effect body drains at its start."
tags: [dom, registry, addEffect, effect, cleanup, disposal, headless]
confirmed: 2026-10-28
---
# Why

`registry.addEffect(node, fn)` wraps the body: with the hooks feature loaded it registers `effect(() => runEffectHooks(node, state, fn), { separate: true })`, and `runEffectHooks` is typed `(node, state, effectFn: () => void) => void` — it calls `fn()` and discards the result. Core's effect captures a cleanup only when the registered function's return is a function (`effectNode.cleanup = isFunction(result) ? result : undefined`), so a `return () => …` from the addEffect body is silently dropped: cleanup-before-rerun and disposal-drain both see `undefined`, re-arms stack listeners, and node removal leaks them. The failure looks like a reactivity bug (effects re-run, arms accumulate) — the wrapper's void contract is the cause. Node-scoped teardown instead: `registry.addHook(node, "beforeDestroy", teardown)` (functional once the hooks feature is loaded — dom's `internal/reactive.ts` side-effect-imports `features/hooks`, so every barrel consumer has it), or closure-held dispose handles the effect body drains at its top on every run.

# Evidence

`packages/dom/lib/registry.ts` — `RunEffectHooksFn` type and the default `runEffectHooks = (_node, _state, effectFn) => { effectFn(); }`; `packages/dom/lib/features/hooks.ts` `runEffectHooks` (return type `void`, bare `effectFn();` call); `packages/core/lib/effect.ts` cleanup capture line; `packages/core/lib/internal/scheduler.ts` lines 91-100/152 (cleanup runs before re-execution and on disposal — only when captured). Confirmed by the failing-then-passing coverage run after redesigning headless `modal()` from cleanup-return arms to closure-held arms plus `beforeDestroy` hooks (2026-10-28).
