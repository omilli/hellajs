# HellaJS @hellajs/store vs. Zustand / Redux Toolkit / Jotai / Valtio / MobX

A ground-up comparison based on the actual source code of `@hellajs/store` v2. Every claim below was verified against `packages/store/lib/`. Competitor versions researched: Zustand 5.0.15, Redux Toolkit 2.12.0, Jotai 2.20.3, Valtio 2.3.2, MobX 7.0.3.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS store | Zustand | Redux Toolkit | Jotai | Valtio | MobX |
|---|---|---|---|---|---|---|
| Reactive model | Construction-time object → per-property signals | Hook over immutable state | Immutable reducers + actions | Atomic atoms (dependency graph) | Proxy over mutable state | TFRP observables (signal-based) |
| State shape | Plain object → signal tree | One immutable object per store | One immutable tree per store | Flat atom graph (composable) | Proxy of original object | Observable classes/objects |
| Mutability model | Direct signal-set (`s(v)`) | Immutable `set(partial)` | Immutable `dispatch` + Immer | `setAtom(v)` | Direct mutation of proxy | Normal JS assignment |
| Granularity | Per-property signals | Whole-state selectors | Whole-state selectors | Per-atom | Per-property (proxy traps) | Per-property (auto-tracked) |
| Update API | `s(v)`, `update(partial)`, `update(draft => …)` | `set(partial)`, `set(s => …)` | `dispatch(action)` | `setAtom(v)`, writable atoms | `state.x = v` | `state.x = v` |
| Snapshot | Reactive `computed` plain object | `useStore(selector)` | `useSelector(selector)` | Read derived atom | `useSnapshot(state)` | Direct read (already reactive) |
| TypeScript | Conditional `Store<T, R>` readonly inference | Manual `create<T>()` | Manual `createSlice<T>` | Inferred from atom init | Inferred; `useSnapshot` readonly is "too strict" per docs | Inferred from `makeAutoObservable` |
| External deps | 0 (+ core peer) | 0 | 6 (immer, redux, reselect, redux-thunk, standard-schema ×2) | 0 | 1 (proxy-compare) | 0 |
| Framework coupling | None — works with any core-signal consumer | React-first; `zustand/vanilla` exists | Framework-agnostic core; React via react-redux | React-first; `jotai/vanilla` exists | React-first; `valtio/vanilla` exists | Framework-agnostic; React via mobx-react-lite |

HellaJS store sits in the same architectural camp as Valtio and MobX — deeply reactive state where each property is independently tracked. Where Valtio and MobX lean on Proxy traps to intercept mutation, HellaJS converts the object into actual signal functions once at creation and never intercepts again. Where Zustand, RTK, and Jotai treat the unit of state as a single immutable value or an atomic box, HellaJS makes the property the unit — closer to MobX's mental model with the ergonomics of a function-call API.

---

## 2. Reactivity Model & State Shape

### HellaJS

A store is built by `createStore()` — exposed through five `store()` overloads (`lib/store.ts`) — walking `Object.entries(initial)` exactly once and emitting a per-property reactive primitive (`lib/internal/create.ts`). The output is a plain object whose properties are *real signal functions* attached via `Object.defineProperty` with `writable: true` (`lib/internal/utils.ts`); there is no Proxy on the hot path and nothing intercepts reads after construction. Branching is type-based: function values are preserved as-is, plain objects recurse into nested stores, and everything else — primitives, arrays, `Date`, `Map`, `Set`, `RegExp`, class instances — becomes a single `signal(value)` leaf (`lib/internal/create.ts`).

There is no global registry, no Provider, and no atom configuration. A store is an object you read by calling `store.foo()` and write by calling `store.foo(v)`; updates propagate through `@hellajs/core`'s dependency graph (the sole peer dependency, `package.json`), so only effects that actually read the changed property re-run. The reserved keys `snapshot`, `update`, and `cleanup` throw on collision at create time unless the initial value is itself a store (`lib/internal/create.ts`, `lib/internal/utils.ts`). Initial state must be a tree — there is no cycle detection, and self-referential objects recurse until the stack overflows (`lib/internal/create.ts`). Composition is by reference: a pre-existing store passed as a property value is detected by `isStore()` and adopted verbatim, so the outer and inner stores share signal references and writes propagate bidirectionally (`lib/internal/create.ts`, verified by `tests/nested.test.ts`).

### Zustand

One store is one immutable object. `create((set, get) => ({ ... }))` returns a React hook; the whole state is replaced on every `set`, shallow-merged by default, with `set(newObject, true)` available for full replacement (per the Zustand README). Components subscribe via selectors with strict-`===` equality, so the "atom" of reactivity is the selector output, not the property — selecting multiple slices requires `useShallow` or a custom equality function to avoid re-renders. The vanilla entry (`zustand/vanilla`) exposes `getState`/`setState`/`subscribe` for non-React use, but the model remains whole-state replacement: mutating `state.user.name` directly does nothing; every change produces a new `user` object.

### Redux Toolkit

One global store per app, sliced into reducers. State updates are events: `dispatch(action)` flows through reducers that produce a new immutable tree, with `createReducer()` and `createSlice()` automatically wrapping reducers in Immer so authors write `state.todos[3].completed = true` and get a new immutable value out (per the RTK README). React integration runs through `useSelector` with `reselect` memoized selectors for derived state; `createListenerMiddleware()` provides reactive side effects, and RTK Query (`createApi`) layers data fetching and caching on top of the same dispatch pipeline. It is the most opinionated model in the group — time travel, action logs, and serializability guarantees, at the cost of six runtime dependencies and the largest conceptual surface.

### Jotai

Atoms are the unit of state. Each atom is an independent node in a dependency graph; derived atoms compose declaratively via `atom((get) => get(a) + get(b))`, and async atoms are first-class behind React Suspense (per the Jotai README). There is no central store to configure — though a `Provider` can host a per-root atom graph, and `getDefaultStore()` plus `jotai/vanilla`'s `createStore()` provide a framework-free store API for reading, writing, and subscribing to atoms outside React. Depth is manual: nested state means one atom per node or a single atom holding an object that is replaced wholesale on write.

### Valtio

`proxy({ count: 0 })` returns a deeply tracked Proxy. Mutating `state.count++` notifies subscribers synchronously; nested objects and arrays are proxied recursively on access, so deep mutation "just works" with plain JavaScript (per the Valtio README). `useSnapshot(state)` returns a frozen immutable snapshot wrapped in a second read-tracking proxy (via `proxy-compare`) so components re-render only when the properties they actually accessed change. The TypeScript return type of `useSnapshot` is deeply `readonly` and the README itself notes it "can be too strict," suggesting a module augmentation to loosen it. `valtio/vanilla` exposes `proxy`, `subscribe`, and `snapshot` for non-React use; computed values are object getters, with documented `this`-binding pitfalls inside snapshots.

### MobX

`makeAutoObservable({ count: 0, inc() { this.count++ } })` wraps every field in an observable. Reads inside `observer()` components — or `autorun`/`reaction`/`when` — are auto-tracked transparently, and writes via normal assignment propagate through MobX's internal graph (per the MobX README, which describes the library as "signal based"). The full TFRP toolkit ships in the core package: `computed`, actions and `runInAction`, `flow` for async, `transaction`, `untracked`, `spy`/`observe`/`intercept` hooks, and `toJS` serialization; observable modifiers (`observableRef`, `observableShallow`) tune tracking depth. The core is framework-agnostic with zero dependencies; React integration comes from `mobx-react-lite`. It is the most feature-rich and the heaviest runtime in the group.

**Verdict:** HellaJS, Valtio, and MobX share the "deeply reactive plain object" model. Valtio and MobX intercept mutations at access time via Proxy/trap machinery; HellaJS does its work once at construction and exposes signals as plain callable properties. The cost of that choice is that "just mutate the object" does not work — you call `s(v)`. The benefit is zero interception overhead on reads, type-level readonly inference, and granular effect propagation inherited from core's dependency graph. Zustand, RTK, and Jotai occupy the "single value or atom" camp and solve deep updates through immutability (Zustand, RTK) or explicit composition (Jotai).

---

## 3. Dependencies

| | HellaJS (store) | Zustand | Redux Toolkit | Jotai | Valtio | MobX |
|---|---|---|---|---|---|---|
| Runtime deps | 0 | 0 | 6 (immer, redux, reselect, redux-thunk, `@standard-schema/spec`, `@standard-schema/utils`) | 0 | 1 (proxy-compare) | 0 |
| Peer deps | `@hellajs/core` | react, immer (both optional) | react, react-redux (optional) | react | react | none |

- `@hellajs/store` declares zero runtime dependencies and a single peer — the reactivity core (`package.json`). MobX is the only competitor that matches the zero-dependency core; Zustand and Jotai also weigh in at zero runtime deps, while RTK's six reflect its batteries-included scope and Valtio's `proxy-compare` is load-bearing for its snapshot model.
- The package ships a pre-bundled `@hellajs/store/bundle` entry plus per-module subpath exports (`package.json`), so `store` and its internals are importable individually — though the public surface is small enough (`store` plus types) that the split matters less than in `@hellajs/dom`.
- HellaJS is a composable package rather than a framework: the store depends on nothing but signals, persistence and async are delegated to sibling packages or user code, and the hook-based competitors (Zustand, Jotai, Valtio, react-redux) assume a component tree on the other end while MobX stays framework-agnostic alongside it.

---

## 4. Update Mechanism

HellaJS supports three update paths:

1. **Direct signal call**: `store.user.name('Jane')` writes one property through the signal function (`lib/internal/create.ts`). The signal's equality check means a write that does not change the value is silent.
2. **Partial deep merge**: `store.update({ user: { name: 'Jane' } })` walks the partial, recursing into nested stores that carry their own `update` method and writing signal-backed leaves through `applyUpdate()` (`lib/internal/create.ts`, `lib/internal/utils.ts`). Writes are restricted to each store's settable-key registry — a non-enumerable set of signal-backed keys built at creation and threaded through composition (`lib/internal/create.ts`) — so unknown keys, reserved keys, and preserved user functions are silently ignored, and `update({ onSave: fn })` never invokes the function.
3. **Draft mutator**: `store.update(draft => { draft.items.push(x); draft.count++ })` materializes the snapshot, deep-clones it with class prototypes preserved, lets the mutator run freely, then diffs original against draft to emit only the changed signals (`lib/internal/create.ts`, `lib/internal/draft.ts`). Comparison is structural: arrays compare element-by-element, `Date`/`Map`/`Set`/`RegExp` and class instances compare by content, nested plain objects recurse, and only genuine deltas produce writes — effects subscribed to untouched properties do not fire (`lib/internal/draft.ts`, verified by `tests/draft.test.ts`).

Middleware hooks into all three paths: `applyUpdate()` runs the per-key transform before the signal setter fires (`lib/internal/utils.ts`), and the draft path inherits it because extracted changes route through the same loop (`tests/middleware.test.ts`).

| Library | Update style | Ergonomics |
|---|---|---|
| HellaJS | Signal call, `update(partial)`, or `update(draft => …)` | Three explicit paths; middleware on every write |
| Zustand | `set({ k: v })` shallow-merge, or `set(state => ({...}))` | Immer middleware available for nested mutation |
| Redux Toolkit | `dispatch(slice.actions.x(payload))` | Immer-wrapped reducers — `state.x += 1` inside a reducer |
| Jotai | `setAtom(v)` or writable derived atoms | Update logic encoded in the atom's write function |
| Valtio | `state.x = v` (direct proxy mutation) | Most ergonomic for nested mutations; no API to learn |
| MobX | `state.x = v` (direct assignment) | Identical to plain JS; `runInAction` for batches |

Valtio and MobX win on raw mutation ergonomics — you write normal JavaScript. RTK's Immer-wrapped reducers are close behind for nested updates but require the action indirection. HellaJS's draft path matches Immer's ergonomics for array-heavy mutations without taking an Immer dependency — the clone-plus-structural-diff is hand-written in `lib/internal/draft.ts`. Zustand and Jotai require the most manual work for nested structures.

---

## 5. Snapshot & Derivation

HellaJS `snapshot` is a `computed()` that iterates the store's cached key list, skips reserved keys, and produces a plain-object view (`lib/internal/create.ts`). The branch order per key: preserved user functions pass through as the original reference (discriminated by the settable-key registry, not by value shape), store values delegate to their own `snapshot()` computed, signal functions are called, and anything else mirrors as-is. Nested snapshot computeds chain, so the parent subscribes through them to the full tree — mutating any leaf signal in a composed tree re-runs the outermost snapshot, and composed leaves unwrap to plain values (`lib/internal/create.ts`, verified by `tests/snapshot.test.ts`). The `Snapshot<T>` type mirrors this at the type level, recursively unwrapping composed `Store` members to their data types (`lib/types.d.ts`).

| Library | Snapshot pattern | Reactivity |
|---|---|---|
| HellaJS | `store.snapshot()` — reactive computed | Reactive across the full composed tree |
| Zustand | `useStore(selector)` | Selector determines scope |
| Redux Toolkit | `useSelector(selector)` + `createSelector` memoization | Selector determines scope |
| Jotai | Derived atoms: `atom((get) => …)` | Reactive by construction |
| Valtio | `useSnapshot(state)` via proxy-compare | Reactive per accessed property |
| MobX | Direct read inside `observer()` | Auto-tracked |

HellaJS's snapshot is closer to Valtio's `useSnapshot` than to RTK's `useSelector` — it produces a value rather than asking the caller to project one. The cost is that a single property change re-runs the whole snapshot computed (and, through chaining, every nested snapshot on the path), so for wide or deeply composed stores the docs recommend reading individual signals in effects rather than the snapshot (`docs/api/store.mdx`). Zustand, RTK, and Jotai force you to write a selector, which is more boilerplate but scales linearly with state width.

---

## 6. Granularity & Deep Reactivity

HellaJS makes each primitive property its own signal (`lib/internal/create.ts`). Two effects that read different properties of the same store never interfere — only the signal that actually changed propagates through core's graph. Arrays are a deliberate exception: an array becomes a single `Signal<Array>`, not per-element signals (`lib/internal/create.ts`), so any element change rewrites the array and wakes its subscribers; the draft-mutator path is the intended tool for fine-grained array edits, and its structural diff keeps untouched sibling values from rewriting (`lib/internal/draft.ts`). Direct writes are reference-compared by default, but the `equals` option opts individual keys into content equality — `'structural'` reuses the draft comparator, or a custom `(previous, next)` comparator runs inside the signal, after middleware — so an equal-content replacement wakes no subscriber (`lib/internal/create.ts`, verified by `tests/equals.test.ts`).

Readonly enforcement is a `computed()` wrapping the underlying signal, so a readonly property works as a getter but silently ignores writes at runtime (`lib/internal/create.ts`, verified by `tests/readonly.test.ts`). Readonly does not propagate into nested stores — recursive `createStore()` calls receive only nested middleware, never the readonly option (`lib/internal/create.ts`) — so each level is configured independently, while a pre-configured readonly store composed into a parent retains its readonly state because its signals are adopted verbatim on the `isStore` path (`lib/internal/create.ts`).

| Library | Granularity | Deep reactivity | Notes |
|---|---|---|---|
| HellaJS | Per-property signals; arrays as one signal | Yes, recursive | Readonly via computed wrap; top-level keys only |
| Zustand | Selector output | No | Whole-state replacement |
| Redux Toolkit | Selector output | No | Tree replaced per action |
| Jotai | Per-atom | Manual (one atom per node) | No implicit nesting |
| Valtio | Per-property (proxy traps) | Yes, recursive | `deepClone`/`unstable_deepProxy` utils for depth control |
| MobX | Per-property (auto-tracked) | Yes, recursive | `observableRef` / `observableShallow` opt-outs |

HellaJS, Valtio, and MobX all provide automatic deep reactivity. Valtio and MobX do it by intercepting every access; HellaJS does it by constructing the signal tree up-front and never intercepting again. The trade-off: a HellaJS store's shape is fixed at creation — `update()` ignores keys absent from the initial object because they have no signal (`lib/internal/create.ts`, `lib/internal/utils.ts`) — whereas Valtio and MobX observe new keys the moment they are assigned. For state shapes that genuinely grow at runtime, that is a real gap. A related sharp edge: store properties are `writable: true` (`lib/internal/utils.ts`), so externally reassigning one replaces the signal with a plain value and silently drops its reactivity.

---

## 7. TypeScript Inference

HellaJS's `Store<T, R>` mapped type encodes the entire transformation in the type system (`lib/types.d.ts`):

- Functions preserve their original signature (`T[K] extends (...args) => unknown ? T[K]`).
- Arrays become `Signal<Array>` when writable, `() => Array` when the key is in `R`.
- Plain objects recurse as `Store<T[K]>` — readonly applies to top-level keys only; nested levels are independently configured, matching the runtime (`lib/types.d.ts`).
- Primitives become `Signal<T>` when writable, `() => T` when readonly.

`ReadonlyKeys<T, O>` extracts the readonly key set from the options object conditionally (`lib/types.d.ts`), so `store(initial, { readonly: ['apiUrl'] })` produces a type where `apiUrl` is a `() => string` and the rest are signals. `PartialDeep<T>` types the `update()` argument, preserving arrays and functions as leaves so a partial update to `{ items: [...] }` is a full replacement, not a deep merge (`lib/types.d.ts`). `StoreMiddleware<T>` mirrors the same shape for nested middleware.

| Library | Inference | Readonly typing |
|---|---|---|
| HellaJS | Conditional on initial shape | First-class — `R` parameter at the type level |
| Zustand | Manual `create<T>()` | Manual; no compile-time enforcement |
| Redux Toolkit | Manual `createSlice<T>` | Manual; Immer-wrapped reducers infer state |
| Jotai | Inferred from atom initial value | Manual via read-only atoms |
| Valtio | Inferred from proxy initial | `useSnapshot` returns over-strict `readonly` per its own docs |
| MobX | Inferred from `makeAutoObservable` | Manual via `observableRef` and action discipline |

HellaJS's readonly is the strongest of the group at the type level: a single declaration (`{ readonly: ['apiUrl'] }` or `{ readonly: true }`) produces a store type where the disallowed setters do not exist — writing through them is a compile error, not a runtime no-op. Valtio's `useSnapshot` returns an over-strict `readonly` type that its own README suggests loosening via module augmentation. MobX has no compile-time readonly on plain `makeAutoObservable`. Zustand and RTK leave readonly to user discipline.

---

## 8. Memory Management

HellaJS `cleanup()` recursively walks the store tree, skips reserved keys, and calls `cleanup()` on each nested store (`lib/internal/create.ts`). Individual signals are *not* disposed — they remain functional after cleanup, and the store object stays intact with its properties in place (`lib/internal/create.ts`, verified by `tests/cleanup.test.ts`). The reasoning: signals owned by other contexts (composed stores, external effects) should not be torn down because the wrapping store is. Cleanup is idempotent — calling it twice is a no-op (`tests/cleanup.test.ts`).

| Library | Cleanup model | What's disposed |
|---|---|---|
| HellaJS | Explicit `store.cleanup()` + per-key `subscribe` disposers | Nested store structure; leaf signals intentionally survive; subscribe effects are user-managed |
| Zustand | Manual subscriber unsubscribe | Whatever the caller unsubscribes |
| Redux Toolkit | Store lives for the app lifetime | Entire store on teardown |
| Jotai | Atom values per Provider/store | Atom cache when the store is dropped |
| Valtio | `unsubscribe()` per subscribe | Listeners; proxy retained while referenced |
| MobX | `reaction()`/`autorun()` disposers | Reactions; observables GC'd by reachability |

HellaJS's recursive cleanup is the most explicit of the group — one call on the root tears down the tree. MobX's reachability-based GC is the most automatic (observables vanish when nothing references them). Valtio requires per-subscription `unsubscribe()` calls and ships no whole-store teardown. The HellaJS signal-survival design is deliberate but unusual: compose a user store inside an app store and call `appStore.cleanup()`, and the user store's structure tears down while its signals keep working — a sharp edge if you expected cleanup to release everything.

---

## 9. Built-in Features Matrix

| Feature | HellaJS | Zustand | Redux Toolkit | Jotai | Valtio | MobX |
|---|---|---|---|---|---|---|
| Deep reactivity | Yes, automatic | No (immutable) | No (immutable + Immer) | No (atomic, manual) | Yes, automatic | Yes, automatic |
| Per-property tracking | Yes, via signals | No | No | Per-atom | Via proxy traps | Via auto-tracking |
| Draft mutator | Yes (`lib/internal/draft.ts`) | Via immer middleware | Yes (Immer in reducers) | Via writable atom | N/A (mutate directly) | N/A (mutate directly) |
| Partial deep merge | Yes (`lib/internal/create.ts`) | Shallow only | Per-reducer | N/A | N/A | N/A |
| Reactive snapshot | Yes (`snapshot()`) | Selector | Selector | Derived atom | `useSnapshot` | Auto-track |
| Compile-time readonly | Yes (`lib/types.d.ts`) | No | No | No (manual) | Over-strict | No |
| Per-key middleware | Yes, nested (`lib/internal/utils.ts`) | Via middleware | Via middleware | Via atom write fn | No | Yes (`intercept`, `observe`) |
| Custom write equality | Yes, per key (`equals`: comparator or `'structural'`, `lib/internal/create.ts`) | On selectors (`useStoreWithEqualityFn`, `subscribeWithSelector`) | No | No | No | Yes (`comparer.structural` on computed) |
| Subscription API | Per-key `subscribe(key, cb)` with `(next, prev)` | Whole-store `subscribe(listener)` | `store.subscribe()` per store | `sub()` per atom | `subscribe(proxy, cb)` per object | `observe`/`intercept` per observable |
| Async actions | Via `resource` package | Yes (async `set`) | `createAsyncThunk` | Async atoms + Suspense | Suspense-compatible | `flow` |
| DevTools integration | None | Redux DevTools | Redux DevTools (best-in-class) | Separate `jotai-devtools` package | Redux DevTools | mobx-devtools extension |
| Persistence | None | `persist` middleware | Via middleware | `atomWithStorage` | Manual via `subscribe` | Manual |
| SSR safety | DOM-free, server-safe (no DOM references in `lib/`) | Yes | Yes | Yes | Yes | Yes |
| Store composition | By reference, shared signals (`lib/internal/create.ts`) | Slices pattern | Slices in one store | Atom composition | `proxy` nesting | Observable nesting |

### Notable HellaJS differentiators

- **Compile-time readonly inference from a single option** — `{ readonly: ['apiUrl'] }` or `{ readonly: true }` produces a store type where the disallowed setters are absent, not merely runtime no-ops (`lib/internal/create.ts`, `lib/types.d.ts`).
- **Three explicit update paths in one API** — direct signal call, `update(partial)` deep merge, and `update(draft => …)` mutation diff, with no external Immer dependency (`lib/internal/create.ts`, `lib/internal/draft.ts`).
- **Per-key middleware with deep nesting** — middleware recurses into nested store keys automatically through the store factory (`lib/internal/create.ts`, `lib/internal/utils.ts`).
- **Properties are real signals, not Proxy traps** — `Object.defineProperty` with `writable: true` makes each property a callable signal function; nothing intercepts reads or writes after construction (`lib/internal/utils.ts`).
- **Settable-key registry guards every write path** — `update()` writes only signal-backed keys tracked in a non-enumerable registry threaded through composition, so reserved keys cannot be hijacked and preserved functions are never invoked (`lib/internal/create.ts`).
- **Recursive cleanup with signal survival** — one call tears down the store tree while leaving leaf signals functional for shared or composed state (`lib/internal/create.ts`).
- **Store composition by reference** — nested stores share signal references bidirectionally; writes from either side propagate (`lib/internal/create.ts`, verified by `tests/nested.test.ts`).

---

## 10. Ergonomics & Syntax

```typescript
import { effect } from '@hellajs/core';
import { store } from '@hellajs/store';

const app = store({
  count: 0,
  user: { name: 'Alice', preferences: { theme: 'dark' } },
  items: [1, 2, 3],
});

// Read
app.count();                       // 0
app.user.preferences.theme();      // 'dark'

// Write a single property
app.count(1);
app.user.preferences.theme('light');

// Partial deep merge
app.update({ user: { name: 'Bob' } });

// Draft mutator (Immer-style, no Immer dependency)
app.update(draft => {
  draft.items.push(4);
  draft.count = draft.items.length;
});

// Reactive derivation
effect(() => console.log(app.user.name()));
```

The API is one function plus four methods. Compared to the field: Zustand stores are hooks, so reads and writes route through `useStore`/`set` and the most idiomatic usage lives inside React; HellaJS exposes plain functions callable anywhere with no hook or Provider requirement. RTK asks for a slice definition, action creators, a reducer, a provider, and a selector for each piece of state, returning the investment at scale in devtools, time travel, and RTK Query — HellaJS optimizes for the case where you just want reactive state. Jotai derives its structure from atom declarations rather than the initial object, and its `atom((get) => …)` composition has no direct HellaJS equivalent — HellaJS stores compose by passing store instances as values, sharing signals rather than deriving them. Valtio is the closest in feel — `proxy(state)` + `useSnapshot` versus `store(state)` + property calls — and its mutation ergonomics (`state.x = v`) read cleaner than `s.x(v)`, at the price of Proxy interception on every access and an over-strict snapshot type. MobX matches HellaJS's deep reactivity and adds transparent tracking (`observer` auto-tracks reads with no explicit `effect()` wiring); it is strictly more feature-rich, and strictly larger.

---

## Bottom Line

Architecturally, `@hellajs/store` belongs to the deeply reactive camp alongside Valtio and MobX. Its distinctive choice is *construction-time conversion*: instead of intercepting every read and write with a Proxy trap, it walks the initial object once and produces a tree of real signal functions. That buys type-level readonly inference no competitor matches, zero interception overhead on the hot path, granular propagation inherited from `@hellajs/core`, and three explicit update paths — all with zero runtime dependencies beyond the core peer.

What sets HellaJS apart — and no single competitor matches all of:

1. **Compile-time readonly from a single declaration** — Valtio and MobX have no static readonly; Zustand and RTK leave it to user discipline (`lib/types.d.ts`).
2. **Properties as real signal functions, not Proxy traps** — Valtio and MobX intercept on every access; HellaJS converts once at creation and never intercepts again (`lib/internal/utils.ts`).
3. **Three first-class update paths without an Immer dependency** — direct call, `update(partial)`, and `update(draft => …)` over a hand-written structural diff (`lib/internal/draft.ts`).
4. **Framework-agnostic with no Provider and no hook requirement** — Zustand, Jotai, and Valtio are React-first with vanilla escape hatches; RTK reaches React through react-redux; HellaJS works anywhere `@hellajs/core` works (`package.json`).
5. **Per-key middleware wired into the construction loop** — nested middleware distributes into nested stores at creation, and every write path — direct, partial, and draft — passes through it (`lib/internal/create.ts`, `lib/internal/utils.ts`).
6. **Per-key subscription with previous-value callbacks** — `subscribe(key, cb)` hands side effects `(next, prev)` for a single property with no whole-tree read and no Proxy interception; Zustand and RTK subscribe to whole state, Jotai per atom, Valtio per proxy object, MobX per observable (`lib/internal/create.ts`, verified by `tests/subscribe.test.ts`).
7. **Recursive cleanup that preserves shared leaf signals** — composed stores tear down without killing signals that other contexts own (`lib/internal/create.ts`).

Its gaps are the predictable ones: ecosystem size (no devtools bridge, no `persist` middleware, no Redux DevTools story), no per-element array reactivity (arrays are single signals — the draft path is the escape hatch, and per-key `'structural'` write equality silences content-equal array rewrites), a fixed creation-time shape (`update()` cannot introduce keys the initial object did not have, while Valtio and MobX observe new properties on assignment), no async or suspense primitives in the package itself (delegated to `@hellajs/resource`), and a whole-tree re-computation cost on `snapshot()` that makes wide stores read better through individual signals. For applications living in the HellaJS ecosystem that want deeply reactive state with the strongest readonly typing at the smallest dependency cost, it is the leanest option here. For applications that need devtools, time travel, async flows, or runtime-shape growth, Valtio and MobX remain the safer bets.
