---
type: decision
title: Build signalArray/signalMap/signalSet - partial Vue/Solid collection parity, 004's dissolution overturned
description: Build all three core collection primitives for partial Vue/Solid parity (004 overturned 2026-09-09); store converts object elements to stores (patch writes, full recursion); core stays raw.
tags: [arch, core, store, collections]
timestamp: 2026-09-09
last_confirmed: 2026-09-09
triggers: [signalArray, signalMap, signalSet, granular-collections, per-element-array-reactivity, store-comparison-gap, competitive-parity, collection-signals]
supersedes: 004
---
# Why

Memory 004 dissolved per-element array reactivity on "no demonstrated user need" (rendering covered by ForEach keyed LIS; only non-render granular effects would gain). On 2026-09-09 the user re-evaluated without that anchor and chose **competitive parity with Vue/Solid granular collections** as the job — a strategic capability goal, not a user-issue-driven one. Explicit decisions: all three containers (Map/Set included despite no gap row, for parity surface), core placement (public primitives; store consumes). Accepted with eyes open as PARTIAL parity: no deep element proxies (elements stay raw; composition/draft path remains the deep story), container-level structural granularity (any structural op wakes every positional reader — weaker than Vue's per-key tracking), and zero rendering-wake improvement. What it does deliver: granular non-render effects, direct-mutation ergonomics (fixes the documented `todos().push()` footgun in `packages/dom/docs/api/foreach.mdx`), default content-equal no-wake via the reconcile-setter, keyed identity handles (`nodeAt`/`entry`, novel vs Vue/Solid).

Hard constraint for the build: comparison docs state the honest position — granular containers, not deep proxies; core's deep-reactivity row stays "No". The full parity bar lives in `plans/core/code/signal-collections/index.md`.

# Evidence

User decision, 2026-09-09 idea session (explicit: job=parity, scope=all three, placement=core). Depth decision, second fork round same session (explicit: field-precise todo shape chosen over proxy DX and docs-only; folded into the unwritten set; all three containers; patch write semantics; full recursion) — core stays raw, store converts object elements to stores via core's `wrap`/`merge` hooks. Source-verified same session: `createStore`/`materializeKey` has no `Array.isArray` branch — arrays/Map/Set fall through to whole-value `signal()` (`packages/store/lib/internal/create.ts`); ForEach is one whole-array effect (`packages/dom/lib/ForEach.ts`, `resolveValue(each)` inside `registry.addEffect`); `ForEachProps.each: T[] | (() => T[])` accepts the callable hybrid (`packages/dom/lib/types/nodes.d.ts`); core `lib/` was 1,079 lines pre-change.
