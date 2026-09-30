---
type: correction
title: Reactive fn children through a component child slot render their resolved nodes/text - deep-resolve chains land in dom render + both ssr walkers (fixed)
description: A `${() => nodes}` child into a runtime-html component mounts and swaps nodes client-side and serializes server-side - fn-chain children deep-resolve before classification; 221's workarounds retired.
tags: [contract, fix]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [reactive-children, component-slot, html-template, resolveNode, ssr-walk]
supersedes: 221
---
# Why

`resolveNode`'s fn branch used to be text-only, so a function child that reached it through a children array (every component slot: `<${Box}>${() => items().map(...)}</${Box}>`, Box interpolating `${() => props.children}`) stringified to `[object Object],...`; ssr emitted the getter's source text. The documented wrapper pattern (`<Comp>{() => expr}</Comp>`) is now honored everywhere: dom's `runReactiveChild` (`lib/internal/render.ts`, shared by `appendToParent` + `resolveNode`) deep-resolves via `resolveDeep` (`lib/internal/utils.ts`) and classifies - `isDynamic` -> proxy dispatch, node/array/raw -> swap before a persistent anchor, text settles into the anchor (node identity preserved); `hydrate`'s `adoptReactiveRegion` deep-resolves before pairing; ssr's `walkChild`/`walkChildGen` deep-resolve via `resolveDeep`/`resolveAsyncDeep` (`lib/internal/resolve.ts`). Without this, dynamic lists inside vendored html-flavor components still need the 221 workarounds - no longer.

# Evidence

`packages/dom/tests/reactive-children.test.ts` (7 scenarios; discrimination run: 6 fail pre-fix) and `packages/ssr/tests/ssr.test.ts` component-slot + chained-fn exact-`toBe` tests; `bun coverage dom` 535 pass and `bun coverage ssr` 212 pass, exit 0. Worktree `wt/plans-dom-code-reactive-function-children-01-dom-reactive-children`, plan set `plans/dom/code/reactive-function-children/`.
