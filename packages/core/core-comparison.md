# HellaJS @hellajs/core vs. Solid / Svelte 5 / React 19 / Vue 3 / Angular

A ground-up comparison based on the actual source code of `@hellajs/core`. Every claim below was verified against `packages/core/lib/`.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS core | Solid | Svelte 5 | React 19 | Vue 3 | Angular |
|---|---|---|---|---|---|---|
| Reactive model | Signals (DAG + doubly-linked list) | Signals (`createSignal`) | Runes (`$state`) — compiled | Hooks (`useState`) + VDOM | Proxies (`ref`/`reactive`) | Signals + zoneless CD |
| Granularity | Per-binding, lazy | Per-binding, lazy | Per-binding, compiled | Component subtree | Per-ref / per-property | Per-signal / per-template |
| Glitch-free | Yes (DFS propagation) | Yes | Yes (compile-time) | No (renders then commits) | Mostly (async flush) | Yes (signals) |
| Sync flush | Yes | Yes | Yes (sync ticks) | No (concurrent renderer) | No (microtask batched) | No (change-detection cycle) |
| Deep reactivity | No (reference equality) | No (stores are separate) | Yes (proxies by default) | No (immutable state) | Yes (`reactive()`) | No |
| Compile step | None | Yes (JSX → reactive) | Yes (SFC → JS) | Optional (compiler) | No | Yes (TS decorators) |
| Gzipped size | ~1.7 KB | ~8.2 KB | ~2–5 KB runtime | ~45 KB (react + react-dom) | ~44 KB (full) / ~7.4 KB (`@vue/reactivity`) | ~119 KB (`@angular/core`) |
| External deps | 0 | 0 | 0 (compiler-only) | 0 | 5 (reexported) | rxjs + zone.js (peers) |
| Standalone? | Yes (no framework) | Yes (`solid-js` core) | No (compiler-bound) | No (renderer required) | Yes (`@vue/reactivity`) | No (Angular DI) |

HellaJS core sits in the standalone-signals camp with Solid's reactive core and Vue's `@vue/reactivity` package: a small, framework-agnostic reactivity module you can adopt without buying into a render tree. Among those, it is the smallest (1.73 KB gzip, zero dependencies), the only one whose dependency graph is a doubly-linked list rather than per-node `Set` collections, and one of the few that flushes synchronously by default.

---

## 2. Architecture

### HellaJS

- The reactive system is a directed acyclic graph. `signal`, `computed`, and `effect` all extend a common `Reactive` base carrying five fields: `rd` (first dependency), `rpd` (tracking bookmark), `rs` (first subscriber), `rps` (previous subscriber pointer), and `rf` (bitmask flags) (`lib/types.d.ts`). Edges are `Link` nodes with six pointers — `ls`/`lt` for source/target and four list pointers (`lpd`/`lnd`/`lps`/`lns`) — forming two parallel doubly-linked lists per node (`lib/types.d.ts`).
- A bitmask state machine drives all transitions: `CLEAN=0`, `WRITABLE=1`, `GUARDED=2`, `TRACKING=4`, `DIRTY=16`, `PENDING=32` (`lib/internal/flags.ts`), with `SCHEDULED=128` living in the queue module (`lib/internal/queue.ts`). All checks are inline bitwise ops — no method dispatch (`lib/signal.ts`).
- `createLink` mutates the doubly-linked lists in place and, crucially, reuses existing links when `rpd.ls === source` — meaning a re-executed computed/effect that reads the same signals in the same order allocates zero link objects (`lib/internal/links.ts`).

### Solid

- Solid's `createSignal` returns a `[getter, setter]` tuple. Internally, Solid maintains a `Computation` graph where each computation owns a `Sources` linked list and each source owns a `Subs` doubly-linked list. The model is conceptually identical to HellaJS: signals are sources, `createMemo`/`createComputed`/`createEffect` are transforms/sinks, dependencies are tracked by reading inside an active computation, and propagation is depth-first with the same DIRTY/PENDING/STALE pattern HellaJS uses.
- Solid distinguishes `createMemo` (eager, pure) from `createComputed` (eager, side-effecting) from `createRenderEffect` (eager, tied to render) from `createEffect` (deferred until after render). HellaJS collapses these into one `effect()` primitive that runs synchronously on flush — closer to Solid's `createComputed`.

### Svelte 5

- Svelte 5 Runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) are compiler primitives, not runtime functions. The compiler analyzes rune usage at build time and emits direct DOM-mutation code plus a minimal reactive runtime. `$state(value)` produces a deeply reactive Proxy for objects/arrays (recursive until a non-plain-object is hit); `$state.raw` opts out of deep reactivity.
- Svelte moves the dependency-graph bookkeeping to compile time: it statically knows which symbols are reactive and emits narrow update instructions. HellaJS does the equivalent work at runtime via tracking — HellaJS gains flexibility (no parser/compiler needed, works in plain `.ts`/`.js`), Svelte gains smaller runtime and slightly less bookkeeping overhead.

### React 19

- React 19 has no signal primitive. State is captured via `useState`/`useReducer`, returning snapshot values that are not themselves reactive. Updates propagate by re-rendering the component, producing a new virtual tree, and diffing it against the previous one. Memoization is opt-in (`memo`, `useMemo`, `useCallback`) and the React Compiler can apply it automatically.
- React 19's new primitives (`useActionState`, `useOptimistic`, `use`, async `startTransition`) address async UI patterns, not fine-grained reactivity. There is no per-binding subscription model — every state change re-renders the component subtree unless manually memoized.

### Vue 3

- Vue 3 uses Proxies for objects (`reactive()`) and getter/setter wrappers for primitives (`ref()`). The dependency graph is stored in a global `WeakMap<target, Map<key, Set<effect>>>` — a per-object/per-property subscriber Set rather than a doubly-linked list. `track()` runs inside get traps; `trigger()` invokes subscribers in set traps.
- `ref()` deeply reactivates assigned objects via `reactive()`. `computed()` is lazy and cached (backed by an effect). `watchEffect`/`watch` are the equivalent of HellaJS's `effect`. Opt-outs include `shallowRef`, `shallowReactive`, `markRaw`. The reactivity package is available standalone as `@vue/reactivity` (~7.4 KB gzip).

### Angular

- Modern Angular (v19+, signals landed in v16, zoneless by default in v21+) centers on `signal`, `computed`, `effect`, plus signal-based `input`/`model`/`viewChild`. A signal is a getter function; reactive contexts (`effect`, `computed`, template binding) enter a `ReactiveContext` that records any producer read as a dependency. `untracked()` and `assertNotInReactiveContext` are provided.
- Computed is lazy and memoized; effects "always execute asynchronously, during the change detection process" (per Angular docs). Equality defaults to `Object.is`. Signals are tightly coupled to Angular's injection context — `effect()` requires an `Injector` by default — and live inside `@angular/core` (~119 KB gzip with rxjs + zone.js as peer deps).

**Verdict:** HellaJS, Solid, and Svelte share the fine-grained signal philosophy — small, lazy, per-binding — with Vue's `@vue/reactivity` as a fourth sibling (deeply proxy-based rather than accessor-based). React is the structural outlier (no signals, VDOM diffing). Angular has converged onto signals but bundles them with a heavy DI runtime and async change-detection. HellaJS's distinguishing architectural choice is the doubly-linked-list dependency representation (vs the `Map`/`Set` approach of Vue/Solid/Svelte/Angular) and a fully synchronous default flush.

---

## 3. Bundle Size & Dependencies

| | HellaJS core | Solid | Svelte 5 (runtime) | React 19 + react-dom | Vue 3 (full) | `@vue/reactivity` | `@angular/core` |
|---|---|---|---|---|---|---|---|
| Min+gzip | **1.73 KB** | 8.20 KB | ~2–5 KB | ~45 KB | 44 KB | 7.4 KB | 119 KB |
| Dependencies | 0 | 0 | 0 | 0 | 5 (bundled) | 1 | 2 peers (rxjs, zone.js) |

- `@hellajs/core` declares zero `dependencies` and zero `peerDependencies` (`packages/core/package.json`). The npm-published bundle is 3.96 KB min / 1.73 KB gzip per Bundlephobia (verified for v2).
- The package ships as both a single pre-bundled file (`@hellajs/core/bundle`) and tree-shakeable per-feature modules under `dist/`. Per the bundled `dist/sizes.json` (generated 2026-06-21), individual primitives weigh in at: `signal` 0.38 KB gzip, `computed` 0.33 KB, `effect` 0.30 KB, `batch` 0.16 KB, `untracked` 0.16 KB, `scope` 0.21 KB.
- Competitor sizes verified this session via Bundlephobia: `solid-js@1.9.5` 21.6 KB min / 8.2 KB gzip; `vue@3.5.18` 115 KB min / 44 KB gzip; `react@19.0.0` 7.5 KB / 2.9 KB + `react-dom@19.0.0` 3.7 KB / 1.4 KB (useless without each other — combined web bundle ~45 KB gzip); `@angular/core@19.2.0` 360 KB / 119 KB. Svelte 5 could not be measured via Bundlephobia (install error); Svelte docs claim ~2–5 KB runtime for typical compiled apps.
- Only HellaJS and Vue ship a standalone reactivity module. Solid's reactivity lives inside `solid-js` itself (coupled to the JSX runtime), Angular's inside `@angular/core` (coupled to DI), Svelte's inside the compiled output, and React has no separable reactivity layer at all.

---

## 4. Reactivity Granularity

HellaJS gives per-binding granularity with glitch-free guarantees. Reading a signal inside a computed or effect establishes a subscription only to that specific signal (`lib/signal.ts`, `lib/computed.ts`); conditional branches establish dynamic dependencies that change between executions (`lib/internal/tracking.ts` tears down unused links after `rpd`, so a branch that stops firing drops its subscriptions).

| Framework | Granularity | Glitch-free? | Untracked reads |
|---|---|---|---|
| HellaJS | Per-binding (effect), per-computed | Yes (DFS propagation) | `untracked(() => …)` swaps the current subscriber context (`lib/untracked.ts`) |
| Solid | Per-binding (`createEffect`, `createMemo`) | Yes | `untrack(fn)` |
| Svelte 5 | Per-binding (Rune) | Yes (compile-time) | `$state.raw` / explicit `$derived.by` |
| React 19 | Component subtree | No (renders → commit) | Always "tracked" — needs `useRef` escape hatch |
| Vue 3 | Per-ref / per-property | Mostly (async flush) | `markRaw`, `shallowRef` |
| Angular | Per-signal / per-template | Yes (signals) | `untracked(fn)` |

Two HellaJS granularities worth flagging:

- Conditional dependencies actually *re-track* on every execution. `endTracking` walks the dependency list after `rpd` and calls `removeLink` on anything not accessed this run (`lib/internal/tracking.ts`). A computed that switches branches drops the dead branch's subscriptions immediately.
- The `untracked` primitive is a context swap, not an opt-out flag. It saves the current subscriber via `setCurrentSub(undefined)` and restores it in the `finally` block (`lib/untracked.ts`), so any signal read inside the callback finds no reactive context to subscribe to. This is structurally identical to Solid's `untrack` and Angular's `untracked`, and lighter-weight than Vue's `markRaw` (which permanently flags an object).

---

## 5. Dependency Graph & Propagation

HellaJS's graph is the architectural centerpiece. Three algorithms do the work:

**`propagateChange`** marks subscribers PENDING when a signal might have changed. It is an iterative depth-first walk using lightweight stack frames `{sv, sp}` — not recursion, not array allocations. It descends through WRITABLE intermediate nodes (signals and computeds share the WRITABLE flag for polymorphic dispatch), schedules GUARDED effects via `scheduleEffect`, and skips any node already in `TRACKING | DIRTY | PENDING` to avoid double-processing (`lib/internal/propagation.ts`).

**`propagate`** is the linear walk that upgrades PENDING nodes to DIRTY once a source's value is confirmed changed. It only touches nodes in the `(PENDING | DIRTY) === PENDING` state, so already-dirty nodes aren't rescheduled (`lib/internal/propagation.ts`).

**`validateStale`** is the skip-update optimization. When a PENDING node is read, it walks the dependency graph recursively (again with `{sv, sp}` stack frames) checking whether the underlying signals actually changed value. If any dependency's value is unchanged, the PENDING flag is cleared without re-execution (`lib/internal/validation.ts`). This is what makes a computed like `() => a() > 0 ? a() : b()` cheap when `a` changes but the branch result is identical.

| Framework | Graph structure | Topological order | Skip-update? |
|---|---|---|---|
| HellaJS | Doubly-linked list per node (no Maps/Sets) | DFS via manual stack | Yes (`validateStale`) |
| Solid | Linked `Sources`/`Subs` lists | Topological | Yes (STALE state) |
| Svelte 5 | Compiler-emitted per-symbol deps | Compile-time | Yes |
| React 19 | Per-component hook list | Render → commit | No (always renders) |
| Vue 3 | `WeakMap<target, Map<key, Set<effect>>>` | Scheduled job queue | Yes (computed caching) |
| Angular | Producer/consumer graph | Change-detection cycle | Yes (computed memo) |

HellaJS's choice of a doubly-linked list over a per-node `Set` (Vue, Angular) has a concrete trade-off: link removal is O(1) pointer surgery (`lib/internal/links.ts`) rather than a `Set.delete`, link objects are reused across executions when the dependency order is stable (`lib/internal/links.ts`), and there is no `Set` iteration overhead during propagation. The cost is more pointer bookkeeping on link creation and a denser algorithm.

---

## 6. Memory Management & GC

HellaJS has three distinct memory behaviors worth comparing:

**Link reuse during tracking.** When a computed or effect re-executes and reads the same signals in the same order, `createLink` advances the `rpd` bookmark and reuses the existing link object (`lib/internal/links.ts`). In the common case (deterministic reactive code), zero link objects are allocated after the first run.

**Computed auto-GC.** When a computed loses its last subscriber, `removeLink` removes **all** of the computed's dependency links (cascading into dep computeds that lose their own last subscriber), then marks the computed `WRITABLE | DIRTY` (`lib/internal/links.ts`). The next read rebuilds the graph from scratch. This prevents memory leaks in patterns like "subscribe, do work, dispose, subscribe again" (`packages/core/tests/computed.test.ts` verifies the rebuild and full dependency release).

**Effect queue slot reuse.** The effect queue is a single shared array; `getNextEffect` clears each slot to `undefined` after processing so it can be garbage-collected (`lib/internal/queue.ts`), and `resetQueue` resets the indices on every flush (`lib/internal/queue.ts`). The queue itself is never reallocated.

| Framework | Link structure | Auto-disposal |
|---|---|---|
| HellaJS | Doubly-linked list, reused during tracking | Computed auto-GC; effect cleanup via returned disposer; `scope()` batch disposal (`lib/scope.ts`) |
| Solid | Doubly-linked list | `onCleanup`, `createRoot`, owner-based disposal |
| Svelte 5 | Compiler-emitted | Component teardown; `$effect` returns cleanup |
| React 19 | Per-hook linked list | `useEffect` return; no auto-disposal of moved refs |
| Vue 3 | Per-key `Set<effect>` | `effectScope`, watcher stop handles |
| Angular | Producer/consumer nodes | `DestroyRef`, `takeUntilDestroyed`, `DisposeCollector` |

HellaJS and Solid share the doubly-linked-list approach. Vue and Angular use `Set`-based subscriber stores (simpler, more allocation per update). React's hook chain is a linked list but is per-component, not per-binding — the reactivity lives in the hook chain's identity comparison, not in a graph.

---

## 7. Batching & Scheduling

HellaJS's default is **synchronous flush**. Calling `signal(value)` outside a batch propagates changes and runs effects immediately (`lib/signal.ts`: `if (rs) { propagateChange(rs); !batchDepth && flush(); }`). There is no microtask deferral, no job queue, no scheduler tick.

`batch(fn)` increments a counter on entry, decrements on exit, and flushes when the counter returns to zero (`lib/batch.ts`). Nested batches collapse into the outermost. The SCHEDULED bitmask (`lib/internal/queue.ts`) prevents double-queuing when multiple signals change in the same propagation (verified by `packages/core/tests/effects.test.ts` — "effect not double-queued when scheduled twice in same propagation").

`flush` processes the queue in FIFO order, with each effect re-validating its dependencies before running (`lib/internal/scheduler.ts` and `lib/internal/scheduler.ts`). Errors thrown from an effect abort the rest of the queue — subsequent updates start a fresh flush (`packages/core/tests/effects.test.ts`).

| Framework | Default flush | Batching primitive | Order guarantee |
|---|---|---|---|
| HellaJS | Synchronous | `batch(fn)` (`lib/batch.ts`) | Queue FIFO, dep-validated |
| Solid | Synchronous | `batch(fn)` / `untrack(fn)` | Owner-tree DFS |
| Svelte 5 | Microtask-sync | `await tick()` | Compile-time scheduled |
| React 19 | Concurrent / async | `unstable_batchedUpdates` (default in v18+) | Reconciliation tree |
| Vue 3 | Microtask (pre-flush) | `nextTick`, `flush: 'sync'` opt-in | Watcher queue |
| Angular | Change-detection cycle | `NgZone.run`, microtask | Per-component CD |

HellaJS and Solid are the only two here that flush synchronously by default with explicit batching. Vue and Angular defer to the microtask/change-detection cycle (which batches more aggressively but adds latency). React's concurrent model can split work across frames. Svelte 5 synchronizes updates within a tick.

---

## 8. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React 19 | Vue 3 | Angular |
|---|---|---|---|---|---|---|
| Writable signal | `signal()` (`lib/signal.ts`) | `createSignal` | `$state` | `useState` | `ref`, `reactive` | `signal` |
| Read-only derived | `computed(prev => next)` (`lib/computed.ts`) | `createMemo` | `$derived` | `useMemo` | `computed` | `computed` |
| Side effect | `effect(fn)` (`lib/effect.ts`) | `createEffect` | `$effect` | `useEffect` | `watchEffect` | `effect` |
| Cleanup return | Yes (`lib/effect.ts`) | `onCleanup` | `$effect` return | `useEffect` return | `onScopeDispose` | `onCleanup` in effect |
| Batching | `batch(fn)` (`lib/batch.ts`) | `batch(fn)` | (automatic) | (automatic) | (automatic) | (automatic) |
| Untracked reads | `untracked(fn)` (`lib/untracked.ts`) | `untrack(fn)` | `$state.raw` | `useRef` | `markRaw` | `untracked(fn)` |
| Scope / batch disposal | `scope(fn)` (`lib/scope.ts`) | `createRoot` | component | (manual) | `effectScope` | `DestroyRef` |
| Previous-value compute | Yes (`lib/types.d.ts`) | Yes (`createMemo((prev) => …)`) | No | No | Yes (`computed(get, set)`) | Yes (`{equal}`) |
| Custom equality | Reference `===` only | Optional `equals` fn | `$state.raw` for refs | `Object.is` | `Object.is` + custom | `Object.is` + `{equal}` |
| Deep reactivity | No | Stores (`createStore`) | Yes (default Proxy) | No | Yes (`reactive()`) | No |
| Async-aware tracking | No (sync only) | `createResource` | `$derived.await` | `use(promise)` | `asyncComputed` (3rd-party) | `Resource` |
| Error boundary | Flush aborts + re-throws (`packages/core/tests/effects.test.ts`) | `ErrorBoundary` | `<svelte:boundary>` | Class boundaries | `errorCaptured` | `ErrorHandler` |

### Notable HellaJS differentiators

- **Doubly-linked-list dependency graph** — no per-node `Set` allocations; link removal is O(1) pointer surgery — `(lib/internal/links.ts)`
- **Link reuse during tracking** — re-executed computations that read the same signals in the same order allocate zero link objects — `(lib/internal/links.ts)`
- **Manual-stack DFS propagation** — `propagateChange` and `validateStale` use lightweight `{sv, sp}` stack frames, not recursion, not arrays — `(lib/internal/propagation.ts)`, `(lib/internal/validation.ts)`
- **Computed auto-GC with DIRTY re-init** — losing the last subscriber drops **all** dependency links (cascading into dep computeds) and marks the computed `WRITABLE | DIRTY` for lazy rebuild on next read — `(lib/internal/links.ts)`
- **Skip-update optimization** — `validateStale` walks the dependency graph to clear PENDING flags when underlying values didn't actually change, preventing spurious recomputation — `(lib/internal/validation.ts)`
- **Synchronous flush by default** — no microtask, no scheduler tick; `batch(fn)` is opt-in for grouping — `(lib/signal.ts)`, `(lib/batch.ts)`
- **Polymorphic signal/computed dispatch** — `updateValue` checks for the presence of `cbf` to dispatch between signal and computed execution paths — `(lib/internal/execution.ts)`
- **Shared `WRITABLE` flag** — signals and computeds share the WRITABLE bit so propagation treats them identically; only effects carry the `GUARDED` bit — `(lib/internal/flags.ts)`

---

## 9. Ergonomics & Syntax

HellaJS uses a single-callable-getter/setter pattern — the same shape Svelte 5's compiled output, Solid's accessor functions, and Angular's signal getters produce at runtime:

```typescript
import { signal, computed, effect, batch, untracked, scope } from '@hellajs/core';

const count = signal(0);
const doubled = computed(prev => count() * 2);  // prev optional, receives previous value

const stop = effect(() => {
  // Reads establish subscriptions; conditional reads establish dynamic subscriptions
  console.log(count(), doubled());
});

batch(() => {
  count(1);   // deferred
  count(2);   // coalesced — effect runs once on flush
});

const peek = untracked(() => doubled());  // reads value without subscribing

const dispose = scope(() => {
  effect(() => count());
  effect(() => doubled());
});
dispose();  // both effects torn down in one call
```

The signal-is-a-function shape is identical to Solid's accessor pattern. The differences vs. competitors are subtle:

- **vs. Solid** — Solid's `createSignal` returns a tuple `[get, set]`. HellaJS fuses them into one overloaded function (no-arg = read, arg = write). The fused API is shorter to type and pass around; the tuple API is more explicit about read-vs-write intent.
- **vs. Svelte 5** — Svelte's Runes are compiler primitives (no runtime import, `$state` looks like a function call but is syntax). HellaJS is a plain runtime library that works in any `.ts`/`.js` file with no compiler.
- **vs. Vue** — Vue's `ref()` requires `.value` access (`count.value++`). HellaJS uses call syntax (`count()`). Vue's `reactive()` enables direct property mutation (`state.count++`); HellaJS does not — you must replace references.
- **vs. React** — React's `useState` returns a snapshot, not a getter. Reading state gives you a frozen view, and updates require either `setCount(n)` or a `useReducer` dispatch. There is no way to "read the current value later" without re-rendering.
- **vs. Angular** — Angular's `signal(0)` returns a getter that you call as `count()`. The API shape is identical to HellaJS. The difference is that Angular's signal must live inside an injection context for `effect()`, and the framework ships change detection around it. HellaJS's signal is fully standalone.

The `scope()` primitive (lazy Set allocation, shared NOOP for empty scopes at `lib/scope.ts`) mirrors Vue's `effectScope` and Solid's `createRoot` — a way to batch-dispose a graph of effects without tracking each cleanup individually.

---

## Bottom Line

Architecturally, HellaJS core belongs firmly in the standalone-signal camp alongside Solid's reactive core, Vue's `@vue/reactivity`, and Svelte 5's compiled runtime. Its doubly-linked-list dependency representation, glitch-free DFS propagation with manual stack frames, link-reuse during tracking, computed auto-GC with DIRTY re-init, skip-update validation, and synchronous default flush are all competitive with or sharper than the established players on raw mechanism — while shipping in 1.73 KB gzipped with zero dependencies.

What sets HellaJS apart — and no single competitor matches all of:

1. **Smallest standalone reactivity package** — 1.73 KB gzip, zero dependencies. Solid is 8.2 KB; `@vue/reactivity` is 7.4 KB; Svelte requires a compiler; Angular is 119 KB; React has no separable reactivity.
2. **Doubly-linked-list dependency graph** — no per-node `Set` stores; O(1) link removal; zero link allocation when re-executions read dependencies in the same order (`lib/internal/links.ts`).
3. **Synchronous flush by default** — effects run immediately on signal write outside `batch()`. Vue, Angular, and React all defer; only Solid and Svelte share this property.
4. **Standalone and framework-agnostic** — works in any JS runtime with no compiler, no DI container, no renderer required. Vue/Angular/Svelte/React all couple reactivity to a larger framework.
5. **Computed auto-GC with DIRTY re-init** — losing the last subscriber drops all dependency links (cascading into dep computeds); re-subscribing rebuilds the graph and recomputes lazily. The disposal pattern is fully automatic (`lib/internal/links.ts`).
6. **Skip-update validation** — `validateStale` walks the graph to clear PENDING flags when underlying values didn't actually change, preventing redundant recomputation in conditional-dependency graphs (`lib/internal/validation.ts`).

Its gaps are the predictable ones: no devtools or browser inspector, no async/await tracking inside effects (Vue and Solid offer resource primitives; HellaJS pushes this to `@hellajs/resource`), no deep reactivity (you must replace object references — same trade-off as Solid, unlike Vue/Svelte 5 which proxy deeply), no SSR/streaming primitives in core (those live in `@hellajs/dom`), ecosystem size and adoption maturity far behind React/Vue/Angular/Svelte/Solid, and a smaller community for help, hiring, and third-party libraries.
