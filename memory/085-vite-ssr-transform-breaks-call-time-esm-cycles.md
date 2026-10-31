---
title: Keep hand-rolled ESM import graphs cycle-free; vite's SSR transform breaks call-time-only cycles
description: vp test runs modules through vite's SSR transform, which destructures import bindings at module-evaluation time, so an ESM cycle whose bindings are only used inside function bodies still fails with "X is not a function" at call time — native ESM would tolerate the same graph.
tags: [vite, esm, cycles, vp-test, compiler, toolchain, ssr-transform]
confirmed: 2026-10-30
---
# Why

Native ESM initializes function declarations at instantiation, so a two-module cycle whose
cross-imports are only dereferenced at call time loads and runs correctly under plain node.
The repo's test runner is not native ESM: `vp test` (vite-plus) transforms each module into a
vite SSR module where `import { x } from "./y"` becomes an evaluation-time destructured
binding. In a cycle, the first-evaluated module captures the not-yet-assigned export as
`undefined`, and every later call throws `TypeError: X is not a function` from deep inside a
passing-elsewhere suite. A hand-rolled multi-module pass (compiler builders, walkers) must
therefore keep its internal import graph acyclic by construction rather than relying on
call-time binding semantics: host shared leaf values in the module that others import from,
and invert the one edge that would close the cycle (e.g. have the assembler's caller pass the
pre-built value, moving the internal call from the hub to its call sites).

# Evidence

`plugins/compiler` (2026-10-30): `builders/vnode.mjs` imported `buildChildrenValue` from
`builders/children.mjs` while `children.mjs` imported the estree primitives from `vnode.mjs` —
call-time-only on both edges, green under `node --input-type=module` probes. Under
`./node_modules/.bin/vp test plugins/compiler/tests` the same graph failed 6 tests with
`TypeError: buildChildrenValue is not a function` (trace through `buildComponentCall`). Fix:
`buildHellaNode` takes the pre-assembled children expression and its three call sites
(`transform.mjs` x2, `utils/static.mjs`) call `buildChildrenValue` themselves — import graph
acyclic, 57/57 green. Watch for the failure signature: a symbol error inside a builder that
only manifests under `vp test`, never under direct node execution.
