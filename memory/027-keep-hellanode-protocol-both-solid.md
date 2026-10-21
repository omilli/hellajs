---
title: Keep HellaNode protocol; both Solid-style DOM emission and shell-template holes rejected
description: JSX-to-DOM compilation was rejected 2026-10-20, and the middle path (hoisted shell templates with per-instance holes) was implemented and rejected 2026-10-21 — memory usage increased with no meaningful speed benefit.
tags: [babel, dom, ssr, hellanode, jsx, templates, architecture, bench]
confirmed: 2026-10-21
---

# Why

"Compile JSX straight to DOM element creation (Solid-style) and ditch the AST" looks like the
obvious optimization, but the HellaNode is the framework's **runtime composition currency**, not
a compile-time intermediate — ditching it is a framework-core rewrite with these verified
anchors:

- Components return HellaNodes (`packages/dom/lib/component.ts` `component()`); `ForEach` reads
  item keys off them (`packages/dom/lib/ForEach.ts` `resolveItemKey`); error boundaries store
  `state.originalNode` to re-mount on reset (`packages/dom/lib/internal/render.ts` `mountNode`).
- `@hellajs/ssr` is a pure HellaNode stringifier with zero DOM imports
  (`packages/ssr/lib/internal/walk.ts`); Solid solves DOM-emission SSR only via a dual compile
  target, which conflicts with the babel plugin's no-options invariant
  (`plugins/babel/AGENTS.md`).
- The update hot path never touches the AST: effects call `renderProp` / `runReactiveChild` on
  live elements directly — so ditching the AST cannot move update benchmarks at all; only
  creation-path ops and allocations are in play.
- Solid's biggest creation trick already exists here: fully-static subtrees hoist to module
  consts and mount via `staticDom` WeakMap + `cloneNode(true)`
  (`packages/dom/lib/internal/render.ts` `mountNode`, `plugins/babel/src/utils/static.mjs`).

The middle path — extending hoisting so an element with dynamic descendants gets a hoisted
inert shell template cloned per instance with per-instance holes (child / prop / on:/e:
handler) — was implemented and benchmarked, then **rejected**: creation-path gains did not
justify the cost. Do not re-propose either path without new evidence.

# Evidence

Source read 2026-10-20: `packages/dom/lib/component.ts`, `packages/dom/lib/internal/render.ts`
(`mountNode` static fast-path, `staticDom`), `packages/dom/lib/internal/hydrate.ts`
(`hydrateSequence` marker reader), `packages/ssr/lib/internal/walk.ts` (`walkChildGen` +
sync/async parity invariant), `plugins/babel/src/utils/static.mjs` (`tryBuildStaticJSX`
all-or-nothing rule), `packages/dom/lib/types/nodes.d.ts` (`static?: true` hoist marker).
User decisions: DOM-emission rewrite rejected 2026-10-20 (middle path chosen instead);
shell-template + holes implementation rejected 2026-10-21 — explicit verdict "actually
increased memory usage and showed no meaningful benefit in speed" (bench A/B at 4x throttle,
runs=5: create-1k 252.2→212.5 ms, create-10k 2461.4→2072.4 ms median, judged not worth the
memory cost). Worktree discarded same day.
