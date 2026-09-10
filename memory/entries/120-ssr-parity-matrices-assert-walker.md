---
type: decision
title: "ssr parity matrices assert walker-to-walker equality, not correctness — a new shape needs a sync exact-output assert alongside its parityCases entry"
description: parityCases/streamAsyncParityCases compare ssr.async/ssr.stream output to ssr output — all-three-walkers-wrong regressions pass them; pair each new shape with a sync exact `toBe` test.
tags: [testing, ssr, coverage, parity]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [paritycases-entry, walker-parity-test, ssr-parity-matrix, new-child-shape-coverage]
---
# Why

`packages/ssr/tests/helpers.ts` (`parityCases`, `attributeCases`, `headParityCases`) feeds three matrices: `ssr-async.test.ts` asserts `expect(await ssr.async(node)).toBe(ssr(node))`, `ssr-stream.test.ts` asserts `collect(ssr.stream(node)) === ssr(node)`. Both compare one walker's output to another walker's output — never to expected HTML. If a change makes **every** walker drop, stringify, or mis-wrap a child shape identically (e.g. a `walkChild`/`walkChildGen` pair edited in lockstep, which the parity-invariant comment in `lib/ssr.ts` `walkChild` explicitly demands), every parity assert stays green while the output is wrong.

So the coverage recipe for a new child classification / `SsrMeta.kind` / compile shape is two-part: the `parityCases` entry (guards walker divergence — the lockstep-edit hazard) **plus** one direct sync test in `ssr.test.ts` asserting the exact output string (guards correctness — the all-walkers-wrong hazard). `lib/ssr.ts` `walkChild`'s parity comment already mandates the parityCases half; this entry records why the exact-assert half is not optional.

# Evidence

- `packages/ssr/tests/ssr-async.test.ts` `test.each(parityCases)` — `expect(await ssr.async(node)).toBe(ssr(node))`: equality against the sync baseline, no literal expectation anywhere in the matrix.
- `packages/ssr/tests/ssr-stream.test.ts` `test.each(parityCases)` / `streamAsyncParityCases` — same shape (`collect(...)` vs `ssr(node)` / `ssr.async(node)`).
- Confirmed 2026-09-10 during the ssr tests audit (`plans/ssr/audit/tests/` unit 01): Transition's children had parity coverage in all three walkers but zero exact-output assert in any shape — an array-dropping regression in both walkers would have passed the whole suite.
