# HellaJS @hellajs/core vs. Solid / Svelte 5 / React 19 / Vue 3 / Angular

A ground-up comparison based on the actual source code of `@hellajs/core` v2. Every HellaJS claim below was verified against `packages/core/lib/`. Competitor facts were verified against published npm source this session: `solid-js@1.9.15`, `svelte@5.56.10`, `react@19.2.8` + `react-dom@19.2.8`, `vue@3.5.41` (`@vue/reactivity` + `@vue/runtime-core`), `@angular/core@22.1.3`.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS core | Solid | Svelte 5 | React 19 | Vue 3 | Angular |
|---|---|---|---|---|---|---|
| Reactive model | Signals over a doubly-linked dependency DAG | Signals + owner tree | Runes — compiled to a signal runtime | Snapshot state + VDOM re-render | Proxies (`ref`/`reactive`) over a linked dep graph | Signals + producer/consumer graph |
| Granularity | Per-binding, dynamic per-execution | Per-binding, dynamic per-execution | Per-binding, compiler-analyzed | Component subtree | Per-ref / per-property | Per-signal / per-template |
| Glitch-free | Yes — DFS propagation, each node runs once per cycle | Yes — topological `runTop` re-execution | Yes — version counters + batch traversal | No — render then commit | Yes — id-sorted job queue | Yes — pull-based version polling |
| Default flush | Synchronous (effects run at the write) | Synchronous (memos first, then effects) | Microtask batch (`flushSync` to force) | Concurrent scheduler (lanes) | Microtask (`nextTick`, `flush: 'sync'` opt-in) | Change-detection cycle (async) |
| Deep reactivity | No — reference equality only | No in core (`createStore` is a separate package) | Yes — `$state` proxies deeply | No — immutable updates | Yes — `reactive()` proxies deeply | No |
| Equality | Reference `===` with `NaN` self-equal, optional `equals` comparator | Optional `equals` comparator per signal | `===` / proxy-aware `safe_equals` | `Object.is` bailouts | `Object.is` + custom via options | `Object.is` + optional `equal` per signal |
| Compile step | None | JSX → reactive code (required) | SFC → JS (required) | JSX → JS (compiler optional for memoization) | Templates compiled (required for SFC) | Decorators/templates compiled (required) |
| Standalone reactivity | Yes — the package is only reactivity | Partially — coupled to `solid-js` runtime | No — runes only exist through the compiler | No — hooks need a renderer | Yes — `@vue/reactivity` published separately | No — coupled to `@angular/core` DI |

HellaJS core sits in the standalone-signals camp with `@vue/reactivity` and (loosely) Solid's reactive core: a framework-agnostic reactivity module usable without a render tree. Its distinguishing choices are a doubly-linked-list dependency graph, a fully synchronous default flush, and a single effect primitive with no owner tree, no injection context, and no compiler.

---

## 2. Architecture

### HellaJS

The package is a single reactive engine: three node kinds, one edge type, one state machine, no auxiliary structures.

- Three node kinds share one `Reactive` base — `rd` (first dependency link), `rpd` (tracking bookmark), `rs` (first subscriber link), `rps` (prev subscriber pointer), `rf` (state bitmask) (`lib/internal/links.ts`). Edges are `Link` nodes carrying `ls`/`lt` (source/target) plus four list pointers, forming two parallel doubly-linked lists per node (`lib/internal/links.ts`).
- A bitmask state machine drives every transition: `CLEAN`, `WRITABLE`, `GUARDED`, `TRACKING`, `DIRTY`, `PENDING`, `SCHEDULED` (`lib/internal/flags.ts`). All checks are inline bitwise tests with no method dispatch (`lib/signal.ts`).
- Signals and computeds share the `WRITABLE` bit so propagation treats them identically; effects carry `GUARDED` and are scheduled rather than traversed (`lib/internal/propagation.ts`). `updateValue` dispatches between signal and computed execution by the presence of the compute function `cbf` (`lib/internal/execution.ts`).
- The whole surface is six primitives — `signal`, `computed`, `effect`, `batch`, `untracked`, `scope` — plus a `flush` drain for advanced use (`lib/index.ts`). No owner tree, no context system, no scheduler modes.

### Solid

Solid is the closest sibling architecturally, with the same push-then-schedule shape but array-based edges and an ownership layer HellaJS does not have.

- `createSignal` returns a `[getter, setter]` tuple; the signal object holds `value`, parallel `observers`/`observerSlots` arrays, and an optional `comparator`. Computations (`createMemo`, `createComputed`, `createRenderEffect`, `createEffect`) form a graph over array-based `sources`/`sourceSlots` edges — index-linked rather than pointer-linked (per `solid-js@1.9.15` `dist/solid.js`).
- Solid layers an owner tree on top of the graph: every computation records itself on its `Owner`, `createRoot` establishes ownership boundaries, and `onCleanup`/`dispose` walk the owned arrays. This is the structural cost of automatic disposal.
- Four effect variants with different eagerness (`createMemo` pure/eager, `createComputed` eager, `createRenderEffect` render-phase, `createEffect` deferred post-render) plus `createReaction`, `startTransition`, `useTransition`, and Suspense-aware propagation via a `Transition` context embedded in the write path.

### Svelte 5

Svelte implements the same signal semantics at runtime but lets the compiler do part of the bookkeeping, trading runtime flexibility for narrower emitted code.

- Runes (`$state`, `$derived`, `$effect`) are compiler primitives: the compiler rewrites rune usage into calls against a shipped runtime (`state()`, `derived(fn)`, `effect(fn)` in `src/internal/client/reactivity/`). A signal is a plain object with flags `f`, value `v`, a flat `reactions` array, equality fn, and `rv`/`wv` version counters (per `svelte@5.56.10` source).
- `$state` wraps objects/arrays in a deep reactive `proxy()`; `$state.raw` opts out. Deriveds are lazy with an `UNINITIALIZED` sentinel and DIRTY/MAYBE_DIRTY statuses; connected/disconnected lifecycle flags decide whether a derived without reactions gets torn down.
- The dependency bookkeeping that HellaJS does at runtime (which reads happened, in what order) Svelte partially hoists to compile time — it statically knows which identifiers are reactive and emits narrow update code.

### React 19

React solves observation differently: state is captured, not subscribed to, and change is expressed as re-execution of the component.

- No reactive primitive. `useState`/`useReducer` return snapshot values through a renderer-installed hook dispatcher (`ReactSharedInternals.H` in `react@19.2.8`); the state lives on the fiber (`mountStateImpl` in `react-dom@19.2.8`), and setters schedule work through the lane-based concurrent scheduler.
- Updates propagate by re-rendering the component, producing a new element tree, and reconciling it against the previous one. Memoization is opt-in (`memo`, `useMemo`, `useCallback`); the separate React Compiler can apply it automatically, and its runtime hook (`useMemoCache`) ships inside the `react` package.
- 19-series additions (`use`, `useOptimistic`, `useActionState`, async transitions) address async UI, not fine-grained reactivity. `useSyncExternalStore` is the sanctioned bridge for external signal libraries.

### Vue 3

Vue's reactivity is proxy-fronted — mutation feels native at the call site while a linked-list graph with version counters runs underneath.

- `reactive()` proxies objects (deep, per-property tracking); `ref()` wraps primitives with `.value` access and deeply converts assigned objects. The dependency graph since 3.4 is a `Dep`/`Link` pair of linked lists with version counters — `dep.version` vs `link.version`, plus a `globalVersion` short-circuit (per `@vue/reactivity@3.5.41`).
- `computed` is lazy and memoized with a flag-based dirty system (`refreshComputed`, `isDirty`); effects are `ReactiveEffect`s whose `trigger()` either runs, or defers to a scheduler. `watchEffect`/`watch`, `effectScope`, `shallowRef`, `markRaw`, and `customRef` round out the surface.
- The reactivity core is published standalone as `@vue/reactivity` (one internal dependency), though nearly all usage flows through the full framework.

### Angular

Angular's signals are a first-class graph with pull-based staleness, embedded in — and gated by — the framework's injection and scheduling machinery.

- `signal(initialValue, equal)` returns a `[getter, set, update]` triple; `computed(computation, equal)` is lazy and memoized with `UNSET`/`COMPUTING`/`ERRORED` sentinels. The graph is `producer`/`consumer` nodes joined by link objects: producers singly-linked, live consumers doubly-linked (per `@angular/core@22.1.3` `fesm2022`).
- Staleness is pull-based: each node carries `version` and `lastCleanEpoch`; writes bump a global `epoch`, and consumers poll their producers' versions on demand (`consumerPollProducersForChange`). Effects are "always live" consumers; computeds connect as live consumers only when something live reads them, and losing the last live consumer cascades teardown through the producer chain.
- Effects are framework-coupled: `effect()` asserts an injection context (or takes `options.injector`), auto-registers on `DestroyRef`, and is scheduled through the `ChangeDetectionScheduler` — async by default, inside the change-detection cycle. Angular 22 boots zoneless by default; `zone.js` and `rxjs` remain peer dependencies.

**Verdict:** HellaJS, Solid, Svelte, Vue, and Angular all implement some flavor of push/pull signal graph — the five converge on lazy computeds, per-binding subscriptions, and memoized propagation. React is the structural outlier with snapshot state and tree reconciliation. Within the signal camp, HellaJS's differentiators are representational (pointer-linked doubly-linked lists vs Solid's index arrays, Vue/Angular's version counters, Svelte's flat arrays) and operational (one effect primitive, synchronous flush, zero framework coupling). Solid and Vue are the closest architectural siblings; Svelte trades runtime flexibility for compile-time knowledge; Angular's signals are mechanically excellent but welded to DI and the CD cycle.

---

## 3. Dependencies & Packaging

| | HellaJS core | Solid | Svelte 5 | React 19 | Vue 3 | Angular |
|---|---|---|---|---|---|---|
| Runtime deps | **0** | 3 (`csstype`, `seroval`, `seroval-plugins`) | 0 in output (15 compiler deps) | react: 0; react-dom: 1 (`scheduler`) | `vue`: 5; `@vue/reactivity`: 1 | 0 runtime, 3 peers (`@angular/compiler`, `rxjs`, `zone.js`) |
| Peer deps | **0** | 0 | 0 | react (of react-dom) | 0 | 3 |

- `@hellajs/core` declares zero dependencies and zero peer dependencies (`packages/core/package.json`) — nothing to install alongside it, no dedupe risk, no version negotiation. It is the only package here whose reactivity module is both standalone and dependency-free; `@vue/reactivity` is standalone but internally depends on `@vue/shared`.
- The package ships tree-shakeable per-feature modules (`dist/*.js` via the `./*` exports subpath) plus a prebuilt single file (`@hellajs/core/bundle`) — the entry points are declared in `packages/core/package.json`. Siblings package either a monolithic runtime (Solid, React) or require the compiler pipeline (Svelte, Angular, Vue SFC).
- Svelte's 15 dependencies are build-time only (acorn, magic-string, esrap, zimmerframe, and friends) — the shipped application code embeds the runtime with no npm dependency on `svelte` itself. React and Vue split into cooperating packages (`react`/`react-dom`, compiler/runtime pairs); Angular is a single large core with mandatory peers.

---

## 4. Reactivity Granularity

HellaJS gives per-binding granularity with dynamic, per-execution dependency sets. A read inside a computed or effect creates a subscription exactly when it executes (`lib/signal.ts`, `lib/computed.ts`); after each run, every dependency link past the last-accessed bookmark is removed, so a conditional branch that stops firing drops its subscriptions immediately (`lib/internal/tracking.ts`). The graph is re-derived from scratch on every execution — the documented conditional-dependency behavior (`packages/core/docs/concepts/reactivity.mdx`).

| Framework | Granularity | Glitch-free? | Untracked reads |
|---|---|---|---|
| HellaJS | Per-binding, re-derived each run | Yes — DFS propagation, once per cycle | `untracked(fn)` — swaps and restores the tracking context, nests correctly (`lib/untracked.ts`) |
| Solid | Per-binding, re-derived each run | Yes — `runTop` walks the owner chain in order | `untrack(fn)` |
| Svelte 5 | Per-binding, compiler-assisted | Yes — version counters + batch traversal | `untrack(fn)` |
| React 19 | Component subtree | No — render then commit | No opt-out; `useRef`/`useSyncExternalStore` as escape hatches |
| Vue 3 | Per-ref / per-property | Yes — id-sorted microtask queue | `markRaw`, `shallowRef` (permanent opt-outs) |
| Angular | Per-signal / per-template | Yes — pull-based version polling | `untracked(fn)` |

Two consequences of HellaJS's model worth stating plainly:

- Conditional re-tracking is total. `endTracking` prunes everything after `rpd` (`lib/internal/tracking.ts`), so `computed(() => view() === 'a' ? a() : b())` subscribes to exactly two signals at any moment, and switching branches swaps the set atomically within that execution.
- `untracked` is a context swap, not an object flag. It nulls the current subscriber for the duration of the callback and restores it in `finally` (`lib/untracked.ts`) — structurally identical to Solid's and Angular's equivalents, and lighter than Vue's `markRaw`, which permanently brands the object.

React's granularity stands apart: without signals there is nothing to subscribe to, so the unit of change is the component. Memoization shrinks the recomputed subtree but the subscription model remains render-scoped — per the `useMemo`/`memo` opt-in design in `react@19.2.8`.

---

## 5. Dependency Graph & Propagation

Three algorithms do HellaJS's work, all iterative with lightweight `{sv, sp}` stack frames — no recursion, no array allocation per propagation:

- **`propagateChange`** — the setter's entry. DFS through subscribers, descending `WRITABLE` nodes depth-first, scheduling `GUARDED` effects, marking clean nodes `PENDING`. Nodes already active (`TRACKING | DIRTY | PENDING`) get a local clean flag so they are neither re-marked nor re-scheduled — this is the no-double-queue guarantee and the reason synchronous self-writes stabilize instead of looping (`lib/internal/propagation.ts`).
- **`propagate`** — the confirmation pass. After a value change is committed, a linear walk upgrades `PENDING` subscribers to `DIRTY` and schedules effects (`lib/internal/propagation.ts`).
- **`validateStale`** — the skip-update optimization. When a `PENDING` node is read, a stack-based DFS checks whether underlying values actually changed; if a dependency recomputed to the same reference, the `PENDING` flag clears without re-execution (`lib/internal/validation.ts`). This is why a computed returning an identical value stops propagation cold.

| Framework | Graph structure | Staleness strategy | Skip-update? |
|---|---|---|---|
| HellaJS | Doubly-linked lists, no Maps/Sets/arrays | DIRTY/PENDING bitmasks | Yes — `validateStale` |
| Solid | Array-based `sources`/`observers` with slot indices | STALE/PENDING states + `updatedAt`/`ExecCount` | Yes — `lookUpstream` revalidation |
| Svelte 5 | Flat `reactions` arrays + `rv`/`wv` version counters | DIRTY/MAYBE_DIRTY flags + version compare | Yes — `is_dirty` polling |
| React 19 | Per-component hook list on the fiber | Lanes + reconciliation | No — renders regardless |
| Vue 3 | `Dep`/`Link` linked lists + version counters | `isDirty`/`refreshComputed` with dirty flags | Yes — computed caching |
| Angular | Linked producers/consumers + `version`/`epoch` | Pull-based `consumerPollProducersForChange` | Yes — memoized computed |

The mechanism family splits three ways: HellaJS re-executes and compares values (`isEqual` — reference `===` with `NaN` self-equal — in `executeSignal`/`executeComputed`, `lib/internal/execution.ts`); Svelte, Vue, and Angular stamp version counters and compare integers; Solid re-runs upstream computations with an execution-timestamp guard. Version counters are cheaper per check but add a counter field and increment on every write; HellaJS's value-compare leans on the fact that propagation only reaches nodes that were structurally affected.

The doubly-linked-list representation buys three concrete properties (`lib/internal/links.ts`): link removal is O(1) pointer surgery with no lookup; link creation splices into two lists with no dedup structure to maintain (the `rpd` bookmark checks the last-accessed source, and the tracking fast-path peeks one node ahead to reuse links — zero allocation when a computation re-reads the same signals in the same order); and there is no per-node collection to iterate, so propagation walks raw pointers. The cost is denser algorithms and more pointer bookkeeping on insertion.

---

## 6. Memory Management & GC

HellaJS has three distinct memory behaviors:

- **Link reuse during tracking.** A re-executing computation that reads the same signals in the same order advances its bookmark and reuses existing link objects — steady-state re-runs allocate nothing (`lib/internal/links.ts`).
- **Computed auto-GC.** When a computed loses its last subscriber, `removeLink` drops all of its dependency links — cascading into dependency computeds that lose their own last subscriber — and marks it `WRITABLE | DIRTY` for lazy rebuild on next read (`lib/internal/links.ts`). The behavior is verified by WeakRef canary tests proving full release of multi-dependency and nested-computed graphs (`packages/core/tests/computed.test.ts`).
- **Effect queue hygiene.** The flush queue is a single shared array; each processed slot is cleared to `undefined` so the effect can be collected, and indices reset per flush — the queue is never reallocated (`lib/internal/queue.ts`, `lib/internal/scheduler.ts`).

| Framework | Edge structure | Auto-disposal |
|---|---|---|
| HellaJS | Doubly-linked lists, reused in place | Computed auto-GC with cascade; effect disposal runs cleanup and unlinks everything (`lib/internal/scheduler.ts`); `scope()` batch-disposes (`lib/scope.ts`) |
| Solid | Index-linked arrays + owner tree | Owner-based: `createRoot` + `onCleanup`, owned arrays disposed top-down |
| Svelte 5 | Flat reaction arrays | Component teardown destroys the effect tree; deriveds carry connection flags and re-evaluate lazily |
| React 19 | Hook list on the fiber | `useEffect` return on unmount; no disposal of externally moved nodes |
| Vue 3 | `Dep`/`Link` linked lists | `effectScope.stop()`, watcher stop handles; dep links unlinked on effect stop |
| Angular | Linked producers/consumers | Losing the last live consumer cascades link teardown; `DestroyRef`/`takeUntilDestroyed` for effects |

HellaJS, Vue, and Angular all converge on linked-list edges with some form of "unsubscribe the middle of the chain and the dead branch collects itself." HellaJS's cascade is unconditional — any computed that loses all subscribers detaches completely, relying on `WRITABLE | DIRTY` re-initialization to rebuild costlessly on demand. Angular's analog gates on *live* consumers (effects are always live; computeds become live only when live-read); Svelte's gates on connection flags. Solid achieves disposal through the owner tree instead — correct, but it makes every computation carry ownership metadata. One honest asymmetry: HellaJS effects nested inside a re-running parent effect accumulate (old children keep running until explicitly disposed) — Solid's owner tree cleans these up automatically (`packages/core/tests/effects.test.ts` documents the accumulation).

---

## 7. Batching & Scheduling

HellaJS's default is a **synchronous flush**. A signal write outside a batch propagates and runs effects before the setter returns (`lib/signal.ts` — `propagateChange(rs)` then `!batchDepth && flush()`); a write to a signal with no subscribers does no work at all (`lib/signal.ts`).

`batch(fn)` is a depth counter — increments on entry, flushes when the count returns to zero, nested batches collapse into the outermost (`lib/batch.ts`). The `SCHEDULED` bitmask dedups queue entries when one propagation touches an effect through multiple paths (`lib/internal/queue.ts`). The flush itself is FIFO with per-effect staleness validation, then a dependency walk that runs scheduled child effects in dependency order (`lib/internal/scheduler.ts`). An uncaught effect error aborts the remaining queue; the next write starts a fresh flush with intact state (`packages/core/tests/effects.test.ts`).

| Framework | Default timing | Batching primitive | Notes |
|---|---|---|---|
| HellaJS | Synchronous | `batch(fn)` | `flush()` drain exposed for advanced use (`lib/internal/scheduler.ts`) |
| Solid | Synchronous | `batch(fn)` / automatic per write | Memos (pure) run before effects; optional `MessageChannel` scheduler for transitions |
| Svelte 5 | Microtask batch | Automatic; `flushSync(fn)` forces | Batch commits via `queueMicrotask`; traversal-time schedules bail to avoid double runs |
| React 19 | Concurrent/async | Automatic; `startTransition` to deprioritize | Lane-priority scheduler can split work across frames |
| Vue 3 | Microtask | Automatic; `nextTick` awaits it | Job queue insertion-sorted by component id; `flush: 'sync'` opt-in per watcher; recursion capped |
| Angular | Change-detection cycle | Automatic via scheduler notify | Effects run during CD; zoneless by default in v22 |

Only HellaJS and Solid run effects synchronously at the write. That is a real trade-off, not a free win: synchronous flush makes cause and effect observable in one stack frame (the test suite leans on this everywhere, `packages/core/tests/signals.test.ts`), but it means one write deep in a call tree can run arbitrary effects before returning. Vue and Svelte batch to a microtask for exactly that reason; Angular defers to the CD cycle; React's scheduler goes further and can interleave and interrupt. HellaJS's answer is that `batch` gives you the microtask-style grouping explicitly when you want it, with nothing asynchronous ever happening implicitly.

---

## 8. Built-in Features Matrix

| Feature | HellaJS | Solid | Svelte 5 | React 19 | Vue 3 | Angular |
|---|---|---|---|---|---|---|
| Writable signal | `signal()` — fused getter/setter (`lib/signal.ts`) | `createSignal` — `[get, set]` | `$state` | `useState` | `ref` / `reactive` | `signal` — `[get, set, update]` |
| Read-only derived | `computed(prev => …)` (`lib/computed.ts`) | `createMemo` | `$derived` | `useMemo` (per-render) | `computed` | `computed` |
| Side effect | `effect(fn)` — one primitive (`lib/effect.ts`) | `createEffect` + 3 eager variants | `$effect` | `useEffect` | `watchEffect` / `watch` | `effect` (injection context) |
| Cleanup | Return value from effect fn (`lib/effect.ts`) | `onCleanup` | Return value from `$effect` | Return value from `useEffect` | `onScopeDispose` / `onCleanup` | `onCleanup` (injected) |
| Batching | `batch(fn)` (`lib/batch.ts`) | `batch(fn)` | Automatic | Automatic | Automatic | Automatic |
| Untracked reads | `untracked(fn)` (`lib/untracked.ts`) | `untrack(fn)` | `untrack(fn)` | — | `markRaw` / `shallowRef` | `untracked(fn)` |
| Batch disposal | `scope(fn)` (`lib/scope.ts`) | `createRoot` | Component scope | (manual) | `effectScope` | `DestroyRef` |
| Previous value to compute fn | Yes (`lib/computed.ts`) | Yes (`createMemo((v) => …)`) | No | No | No | No |
| Custom equality | Optional `equals` on signal and computed; equal keeps the old reference (`lib/signal.ts`, `lib/computed.ts`) | Per-signal `equals` option | `.raw` variants | `Object.is` (fixed) | Per-ref via options | Per-signal `equal` option |
| Deep reactivity | No | Separate `createStore` package | Yes (default) | No | Yes (default) | No |
| Write inside computed | Permitted; self-writes stabilize (`lib/internal/propagation.ts`) | No guard in source read | Throws `state_unsafe_mutation` | n/a | Permitted | Throws `InvalidWriteToSignalError` |
| Async-aware tracking | No — sync effects only | `createResource` | `await` in `$derived`/async effects | `use(promise)`, actions | `asyncComputed` (3rd-party) | `resource` |
| Devtools / interop | None | `enableExternalSource`, `observable` | Dev tooling via compiler | `useSyncExternalStore` bridge | Vue DevTools | Built-in devtools formatter |
| Error containment | Flush aborts; next write recovers (`packages/core/tests/effects.test.ts`) | `onError` / owner-scoped handling | `<svelte:boundary>` | Error boundaries | `errorCaptured` | `ErrorHandler` |

### Notable HellaJS differentiators

- **Fused getter/setter callable** — one function, `arguments.length` discriminates read from write, and storing `undefined` is supported (`lib/signal.ts`)
- **Previous-value compute fn** — `computed` receives the prior result for incremental computation (`lib/computed.ts`)
- **Skip-update validation** — `validateStale` clears PENDING flags by comparing actual values, stopping propagation when a recomputed result is reference-identical (`lib/internal/validation.ts`)
- **Computed auto-GC with cascade** — losing the last subscriber detaches the whole dependency branch and re-marks for lazy rebuild (`lib/internal/links.ts`)
- **Zero-allocation steady-state tracking** — same-order re-reads reuse link objects via the `rpd` bookmark (`lib/internal/links.ts`)
- **Manual-stack iterative DFS everywhere** — `propagateChange` and `validateStale` allocate one lightweight stack frame per branch, never recurse (`lib/internal/propagation.ts`, `lib/internal/validation.ts`)
- **Synchronous flush with explicit batch** — no hidden microtask, ever (`lib/signal.ts`, `lib/batch.ts`)

---

## 9. Ergonomics & Syntax

```typescript
import { signal, computed, effect, batch, untracked, scope } from '@hellajs/core';

const count = signal(0);
const total = computed(prev => prev + count());  // prev = previous result

const stop = effect(() => {
  console.log(count(), total());          // reads subscribe
  const snapshot = untracked(() => count()); // read without subscribing
  return () => console.log('cleanup');      // runs before re-run and on stop
});

batch(() => { count(1); count(2); });      // effect runs once, after the batch

const dispose = scope(() => {
  effect(() => count());
  effect(() => total());
});
dispose();                                  // both effects torn down together
```

The signal-is-a-function shape matches Solid's accessor and Angular's getter at the call site; the differences are in the seams:

- **vs. Solid** — Solid returns a `[get, set]` tuple. The fused HellaJS function is shorter to pass around and type (`Signal<T>` is one overloaded callable, `lib/types.d.ts`); the tuple makes read-versus-write intent explicit at the destructuring site. Solid also requires choosing among four effect primitives; HellaJS has one, with cleanup-by-return-value instead of a separate `onCleanup` call.
- **vs. Svelte 5** — runes are compiler syntax: `$state(0)` looks like a function call but only exists inside compiled Svelte files. HellaJS is a plain runtime library in any `.ts`/`.js` context, no compiler, no file-format requirement.
- **vs. Vue** — `ref()` requires `.value` discipline (`count.value++`); HellaJS uses call syntax (`count()`). Vue's `reactive()` permits direct property mutation; HellaJS requires replacing the reference — the same contract Solid's core and Angular's signals impose.
- **vs. React** — `useState` returns a snapshot, not a live value: reading it later gives the render-time value, and the only way to observe change is to re-render. A HellaJS signal is readable anywhere, anytime, and observers are per-read.
- **vs. Angular** — the call shapes are identical, but Angular's `effect()` requires an injection context or explicit injector and schedules through change detection; HellaJS's `effect()` runs anywhere and executes synchronously on flush (`lib/effect.ts`).

One deliberate sharp edge, stated in the docs: effects must be synchronous. An `async` effect body returns before its dependencies are read, breaking tracking — async work is started inside the body and results written back to signals (`packages/core/docs/api/effect.mdx`).

---

## Bottom Line

HellaJS core is a standalone signal engine in the fine-grained camp — the same architectural family as Solid's reactive core, Vue's `@vue/reactivity`, Svelte's compiled runtime, and Angular's signals — with a doubly-linked-list graph, bitmask state machine, and pull-based validation that hold up mechanically against all of them, verified end-to-end by a topology test suite ported from preact-signals (`packages/core/tests/topology.test.ts`).

What sets HellaJS apart — and no single competitor matches all of:

1. **Zero dependencies, zero peers, no framework** — a complete reactive DAG usable in any JS runtime with nothing installed alongside it (`packages/core/package.json`). `@vue/reactivity` needs `@vue/shared`; Solid's core carries its runtime; Svelte and Angular require their compilers; React has no separable reactivity.
2. **One primitive per concept** — one signal, one computed, one effect with cleanup-by-return; no memo/eager/render effect variants, no owner tree, no injection context, no compiler (`lib/index.ts`).
3. **Synchronous flush by default with explicit `batch`** — nothing asynchronous happens implicitly; effects run at the write, once, in dependency order (`lib/signal.ts`, `lib/batch.ts`). Only Solid shares the synchronous default; none combine it with zero coupling.
4. **Computed auto-GC with cascading rebuild** — a computed that loses its last subscriber detaches its entire dependency branch and rebuilds lazily on next read (`lib/internal/links.ts`).
5. **Previous-value compute functions** — `computed(prev => …)` enables incremental accumulation with no extra API surface (`lib/computed.ts`).
6. **Zero-allocation steady state** — re-executions that read the same dependencies in the same order reuse link objects outright (`lib/internal/links.ts`).

Its gaps are the predictable ones: the default equality is reference-based (`===` with `NaN` self-equal, `lib/internal/utils.ts`) with an optional `equals` comparator (`lib/signal.ts`), and there is no deep reactivity, where Vue/Svelte proxy deeply; no async or resource primitives in core (Solid and Angular ship `createResource`/`resource`; HellaJS delegates to `@hellajs/resource`); no devtools, inspector, or external-store interop hook; an uncaught effect error aborts the remaining flush queue rather than being contained per-effect (`packages/core/tests/effects.test.ts`); nested effects accumulate under a re-running parent until explicitly disposed or scoped; and the ecosystem, community, and adoption maturity trail every framework listed here by years.
