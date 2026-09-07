---
type: correction
title: "A scope-death test must write the signal TWICE before removal — subscription order runs the body effect before the swap that disposes the scope, so a single write passes against dead wiring"
description: Scope-death tests need a SECOND pre-removal write: the body effect runs before the swap disposes the scope, so expect(N+1) after one write passes even on dead wiring.
tags: [testing, dom, core, effects]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [scope-death-test, effect-subscription-order, mock-frozen-after-swap, component-scope-test, disposal-order-flush]
---

# Why

A test that proves a component's scope survives a child swap (or, inverted, that the scope died) cannot discriminate with a single signal write before removal. Two facts compose:

1. **Registration order is body-first.** core's `effect()` runs its fn synchronously at registration (`packages/core/lib/effect.ts` — `effectState.ef()` inside `effect()`). Inside `component()`, `scope(() => result = componentFn(props))` runs the component BODY — whose `effect(() => { mock(); sig(); })` subscribes to `sig` FIRST — before `mountNode` mounts the returned fragment, whose reactive child effect (`appendToParent`) subscribes SECOND.
2. **The disposing swap runs in the same flush, later.** On `sig(1)`, the scheduler runs subscribers in registration order: the body effect fires (mock → N+1), THEN the reactive child effect re-renders — and when the scope carrier rides the disposable rendered node, that re-render's `clearRenderedNodes` → `cleanupSubtree` → `clean()` disposes the scope mid-flush.

So `write; flush(); expect(mock).toHaveBeenCalledTimes(N+1)` is satisfied by the pre-disposal run — a broken carrier passes the test. Add a SECOND pre-removal write: `expect(N+2)` fails when the scope is dead (the mock froze at N+1) and passes when it survived. General form: one write proves the effect ran; only the next write proves the scope still owns it.

# Evidence

Verified 2026-09-06 during the fragment-scope-carrier fix run (plans/dom/code/audit-findings/fragment-scope-carrier.md):
- Scratch dump under a temporarily reverted first-child carrier: `peekState` showed the scope on the `"0"` text node after mount and gone after `count(1)+flush()`, yet the single-write test ("keeps a reactive-first fragment-root component's scope across child swaps") PASSED — the body effect's 2nd call landed before the swap disposed it.
- After adding second writes to all five carrier scenarios, every one failed under the revert (`wireFragmentScope(fragment.firstChild, ...)` + pre-recursion hydrate wiring) and passed after restore — `bun coverage dom` 449 pass / 0 fail.
- Source: `packages/core/lib/effect.ts` (synchronous first run); `packages/dom/lib/component.ts` (body runs inside `scope()` before mount); `packages/dom/lib/internal/render.ts` `appendToParent` reactive branch + `clearRenderedNodes` (swap-time disposal via `cleanupSubtree`).
