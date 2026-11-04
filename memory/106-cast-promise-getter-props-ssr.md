---
title: Cast Promise-getter props in ssr tests
description: dom's ForEach/Transition prop types reject Promise-returning getters, so ssr tests exercising them cast the prop value (`as unknown as number[]` / `as unknown as boolean`).
tags: [ssr, tests, typescript, foreach, transition, promise, lint, ts2322]
confirmed: 2026-11-04
---
# Why

dom's component prop types are narrower than the ssr runtime reads them: `ForEach` declares `each: number[] | (() => number[])` and `Transition` declares `show: boolean | (() => boolean)`, so a Promise-returning getter (`each={() => Promise.resolve([1, 2])}`) fails typecheck with TS2322 even though `renderDynamic` reads `meta.props` untyped (`Record<string, unknown>`) and handles the Promise fine at runtime. A test draft written without the cast passes the suite's runtime assertions but reds `vp run lint` — the failure surfaces at the lint gate, not the test gate.

# Evidence

`packages/ssr/tests/ssr-async.test.tsx:53` (`each={() => Promise.resolve([1, 2, 3]) as unknown as number[]}`), `:64`/`:75` (`show={() => Promise.resolve(...) as unknown as boolean}`) — the established cast convention. Applied to `packages/ssr/tests/ssr.test.tsx` (Promise `each`/`show` sync-warn scenarios); `vp run lint` exit 0 and `vp run coverage ssr` exit 0 (222/222) after the casts, 2026-11-04.
