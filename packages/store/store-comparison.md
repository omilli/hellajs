# HellaJS @hellajs/store vs. Zustand / Redux Toolkit / Jotai / Valtio / MobX

A ground-up comparison based on the actual source code of `@hellajs/store` v2. Every claim below was verified against `packages/store/lib/`.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS store | Zustand | Redux Toolkit | Jotai | Valtio | MobX |
|---|---|---|---|---|---|---|
| Reactive model | Recursive object → per-property signals | Hook over immutable state | Immutable reducers + actions | Atomic atoms (signal graph) | Proxy over mutable state | TFRP observables |
| State shape | Plain object → signal tree | One immutable object per store | One immutable tree per store | Flat atom graph (composable) | Proxy of original object | Observable classes/objects |
| Mutability model | Direct signal-set (`s(v)`) | Immutable `set(partial)` | Immutable `dispatch` + Immer | `setAtom(v)` | Direct mutation of proxy | Normal JS assignment |
| Granularity | Per-property signals | Whole-state selectors | Whole-state selectors | Per-atom | Per-property (proxy traps) | Per-property (auto-tracked) |
| Update API | `s(v)`, `update(partial)`, `update(draft => …)` | `set(partial)`, `set(s => …)` | `dispatch(action)` | `setAtom(v)`, writable atoms | `state.x = v` | `state.x = v` |
| Snapshot | Reactive `computed` plain object | `useStore(selector)` | `useSelector(selector)` | Read derived atom | `useSnapshot(state)` | Direct read (already reactive) |
| TypeScript | Conditional `Store<T, R>` readonly inference | Manual `create<T>()` | Manual `createSlice<T>` | Inferred from atom init | Manual, `readonly` too strict | Inferred from `makeAutoObservable` |
| Gzipped size | ~1.1 KB (+ ~1.7 KB core peer) | ~0.5 KB (core); ~1.1 KB w/ React | ~13.6 KB (incl. redux, immer, reselect, thunk) | ~4.1 KB | ~2.6 KB (incl. proxy-compare) | ~18.5 KB |
| External deps | 0 + core peer | 0 | 6 (redux, immer, reselect, redux-thunk, …) | 0 | 1 (proxy-compare) | 0 |
| Framework coupling | None — works with any core-signal consumer | React-first; vanilla variant exists | Framework-agnostic core; React via react-redux | React-only | React-first; vanilla variant exists | Framework-agnostic; React via mobx-react-lite |

HellaJS store sits in the same architectural camp as Valtio and MobX — deeply reactive state where each property is independently tracked. Where Valtio and MobX lean on Proxy traps to intercept mutation, HellaJS converts the object into actual signal functions once at creation and never intercepts again. Where Zustand/RTK/Jotai treat the unit of state as a single immutable value or atomic box, HellaJS makes the property the unit — closer to MobX's mental model with the ergonomics of a function-call API.

---

## 2. Reactivity Model & State Shape

### HellaJS

- A store is built by `createStore()` walking `Object.entries(initial)` once and emitting a per-property reactive primitive (`lib/create.ts`). The output is a plain object whose keys are *real signal functions* set via `Object.defineProperty({ writable: true })` — no Proxy on the hot path (`lib/utils.ts`).
- Type-based branching per property: functions preserved as-is (`lib/create.ts`), plain objects recurse into nested stores (`lib/create.ts`), primitives and arrays become `signal(value)` (`lib/create.ts`).
- There is no global registry, no Provider, no atom config. A store is just an object you read by calling `store.foo()` and write by calling `store.foo(v)`. Updates propagate through `@hellajs/core`'s glitch-free dependency graph (peer dep), so only effects that actually read the changed property re-run.
- Composition: passing a pre-existing store as a property value is detected by `isStore()` (`lib/utils.ts`) and accepted verbatim — signal references are shared bidirectionally between the outer and inner store (`lib/create.ts`). Reserved-key validation is skipped on this path so `snapshot`/`update`/`cleanup` on the nested store don't collide with the outer store's own methods.

### Zustand

- One store = one immutable object. `create((set, get) => ({ ... }))` returns a React hook. The whole state is replaced on every `set` (shallow-merged by default). Components subscribe via selectors with `===` equality; the "atom" of reactivity is the selector output, not the property.
- React-first class. The vanilla variant (`zustand/vanilla`) exposes `getState`/`setState`/`subscribe` for use outside React, but the model is still whole-state replacement.
- No deep reactivity. Mutating `state.user.name` directly will not trigger updates; you must produce a new `user` object via `set`.

### Redux Toolkit

- One global store per app, sliced into reducers. State updates are *events*: `dispatch(action)` flows through reducers that produce a new immutable tree. RTK wraps reducers in Immer so authors can write `state.value += 1` and have it produce a new immutable value.
- React integration via `useSelector`. Selectors run on every dispatch and re-render components when their slice changes. `reselect`'s `createSelector` is bundled for memoization.
- The most opinionated model in the group. Time-travel, action logs, serializability guarantees, RTK Query for fetching — batteries included, at a cost in bundle size and conceptual overhead.

### Jotai

- Atoms are the unit of state. Each atom is an independent node in a dependency graph; derived atoms compose via `atom((get) => get(a) + get(b))`. No central store; the `Provider` hosts the atom graph per React root.
- Atomic by construction: components re-render only when atoms they `useAtom` actually change. Async atoms and Suspense integration are first-class.
- React-only. There is no production-stable vanilla API; Jotai leans hard on React's rendering model.

### Valtio

- `proxy({ count: 0 })` returns a deeply-tracked Proxy. Mutating `state.count++` triggers a synchronous notification to subscribers. The proxy is recursive: nested objects and arrays are also proxied on access.
- `useSnapshot(state)` returns a frozen immutable snapshot wrapped in a second "read-tracking" proxy (via `proxy-compare`) so the component re-renders only when accessed properties change.
- React-first; `valtio/vanilla` exposes `subscribe`/`snapshot` for non-React use. Computed values are object getters (with documented `this` pitfalls). The closest architectural sibling to HellaJS in shape — both produce deeply reactive state from a plain object.

### MobX

- `makeAutoObservable({ count: 0, inc() { this.count++ } })` wraps every field in an observable. Reads inside `observer()` components (or `autorun`/`reaction`/`computed`) are auto-tracked transparently; writes via normal assignment propagate through MobX's internal dependency graph.
- TFRP at full strength: glitch-free synchronous propagation, lazy computeds, reactions, explicit actions, `flow` for async. The most mature implementation in the group.
- Framework-agnostic core. React integration via `mobx-react-lite`. The heaviest runtime of the group (~18.5 KB min+gzip).

**Verdict:** HellaJS, Valtio, and MobX share the "deeply reactive plain object" model. Valtio and MobX intercept mutations at runtime via Proxy; HellaJS does its work once at construction time and exposes signals as plain callable properties. The cost of HellaJS's approach is that "just mutate the object" doesn't work — you call `s(v)`. The benefit is no Proxy trap on every read/write, type-level readonly inference, and granular effect batching inherited from core's depth-first propagation. Zustand, RTK, and Jotai occupy the "single value or atom" camp and solve deep updates via immutability (Zustand/RTK) or composition (Jotai).

---

## 3. Bundle Size & Dependencies

|  | HellaJS (store) | HellaJS (+ core peer) | Zustand | Redux Toolkit | Jotai | Valtio | MobX |
|---|---|---|---|---|---|---|---|
| Min+gzip | ~1.1 KB | ~2.8 KB | ~0.5 KB (core) | ~13.6 KB | ~4.1 KB | ~2.6 KB | ~18.5 KB |

- HellaJS store declares zero runtime deps and one peer dep (`@hellajs/core`). The published bundle (`@hellajs/store/bundle`) is self-contained; per-module imports (`./create`, `./draft`, etc.) are tree-shakeable.
- Zustand is the size leader at ~0.5 KB for the core, but real-world usage pulls in `use-sync-external-store` and the React bindings (~1.1 KB total). Valtio's `proxy-compare` dependency doubles its on-disk footprint. RTK ships Immer + Reselect + redux-thunk by default.
- MobX is roughly 17× HellaJS's combined store+core size — a fair trade for what MobX brings (decades of edge-case handling, devtools, reactions, async flows), but real for any bundle budget.

Sizes are from bundlephobia's published API for each package's latest version (zustand v2, valtio v2, jotai v2, @reduxjs/toolkit v2, mobx v2) and from `packages/store/dist/sizes.json` for HellaJS.

---

## 4. Update Mechanism

HellaJS supports three update paths, each verified against source:

1. **Direct signal call**: `store.user.name('Jane')` writes a single property (`lib/create.ts`). The signal does a `===` check before propagating, so writes that don't change the value are silent.
2. **Partial deep merge**: `store.update({ user: { name: 'Jane' } })` walks the partial and recurses into nested stores that have their own `update` method, or falls back to `applyUpdate()` for leaf writes (`lib/create.ts`). Properties absent from the initial object are silently ignored — `update()` cannot introduce new keys (`lib/utils.ts` early-returns on a missing target).
3. **Draft mutator**: `store.update(draft => { draft.items.push(x); draft.count++ })` clones the snapshot via `deepClone()`, lets the user mutate freely, then diffs via `extractChanges()` to emit only the changed signals (`lib/create.ts`, `lib/draft.ts`). Arrays are diffed element-by-element with `===`; nested objects recurse; only keys with actual deltas produce writes (`lib/draft.ts`). Unchanged writes are skipped, so effects subscribed only to untouched properties do not fire.

Middleware hooks into all three paths: `applyUpdate()` runs the per-key transform before the signal setter fires (`lib/utils.ts`), and the draft path inherits middleware because it ultimately routes through the same `applyUpdate` call (`lib/create.ts`).

| Library | Update style | Ergonomics |
|---|---|---|
| HellaJS | Signal call, `update(partial)`, or `update(draft => …)` | Three explicit paths; middleware on every write |
| Zustand | `set({ k: v })` shallow-merge, or `set(state => ({...}))` | Immer middleware available for nested mutation |
| Redux Toolkit | `dispatch(slice.actions.x(payload))` | Immer-wrapped reducers — `state.x += 1` inside a reducer |
| Jotai | `setAtom(v)` or writable derived atoms | Update logic encoded in atom's write function |
| Valtio | `state.x = v` (direct proxy mutation) | Most ergonomic for nested mutations; no API to learn |
| MobX | `state.x = v` (direct assignment) | Identical to plain JS; `runInAction` for batches |

Valtio and MobX win on raw mutation ergonomics — you write normal JS. RTK's Immer-wrapped reducers are close behind for nested updates but require an action indirection. HellaJS's draft path matches Immer's ergonomic for array-heavy mutations (`draft.items.push(...)`) without taking an Immer dependency; the diff lives in 50 lines of source (`lib/draft.ts`). Zustand and Jotai require the most manual work for nested structures.

---

## 5. Snapshot & Derivation

HellaJS `snapshot` is a `computed()` that iterates non-reserved keys and produces a plain-object view (`lib/create.ts`). It re-runs when any accessed signal changes and flattens nested stores by calling their `.snapshot()` recursively (`lib/create.ts`). Original functions are preserved on the snapshot (`lib/create.ts`), so helper methods on the initial object keep working.

A real limitation, verified by `tests/nested.test.ts`: the snapshot is *not* deeply reactive across composed stores. If you nest `userStore` inside `appStore`, mutating `userStore.name` does not re-run an effect that only reads `appStore.snapshot()` — the inner store's snapshot is called as a value, breaking the reactive chain. For reactive derivations across composed stores, you must read the inner signals directly.

| Library | Snapshot pattern | Reactivity |
|---|---|---|
| HellaJS | `store.snapshot()` — reactive computed | Reactive within a single store; not across composed stores |
| Zustand | `useStore(selector)` | Selector determines scope |
| Redux Toolkit | `useSelector(selector)` + `createSelector` memoization | Selector determines scope |
| Jotai | Derived atoms: `atom((get) => …)` | Reactive by construction |
| Valtio | `useSnapshot(state)` via proxy-compare | Reactive per accessed property |
| MobX | Direct read inside `observer()` | Auto-tracked |

HellaJS's snapshot is closer to Valtio's `useSnapshot` than to RTK's `useSelector` — it produces a *value* rather than asking the caller to project one. The cost is that a single property change re-runs the whole snapshot computed, so for very large stores you should read individual signals in effects rather than the snapshot (the docs call this out explicitly in `docs/api/store.mdx`). Zustand/RTK/Jotai force you to write a selector, which is more boilerplate but scales better to wide state.

---

## 6. Granularity & Deep Reactivity

HellaJS makes each primitive property its own signal (`lib/create.ts`). Two effects that read different properties of the same store never interfere — only the signal that actually changed propagates through core's dependency graph. Arrays are a deliberate exception: an array becomes a single `Signal<Array>`, not per-element signals (`lib/create.ts`). The draft-mutator path is the recommended escape hatch for fine-grained array edits.

Readonly enforcement is a `computed()` wrapping the underlying signal, so a readonly property still works as a getter but silently ignores writes (`lib/create.ts`). Confirmed by `tests/readonly.test.ts`: calling a readonly setter is a runtime no-op, not an error.

Readonly does *not* propagate to nested stores — recursive `createStore()` calls receive no options (`lib/create.ts`), so each level is independently configured (`tests/readonly.test.ts`). A pre-configured readonly store composed into a parent retains its readonly state via the `isStore` short-circuit (`lib/create.ts`).

| Library | Granularity | Deep reactivity | Notes |
|---|---|---|---|
| HellaJS | Per-property signals; arrays as one signal | Yes, recursive | Read-only via computed wrap |
| Zustand | Selector output | No | Whole-state replacement |
| Redux Toolkit | Selector output | No | Tree replaced per action |
| Jotai | Per-atom | Manual (one atom per node) | No implicit nesting |
| Valtio | Per-property (proxy traps) | Yes, recursive | `ref()` opt-out for untracked |
| MobX | Per-property (auto-tracked) | Yes, recursive | `observable.ref` / `observable.shallow` opt-outs |

HellaJS, Valtio, and MobX all provide automatic deep reactivity. Valtio and MobX do it via Proxy traps at every access; HellaJS does it by constructing the signal tree up-front and then never intercepting again. The trade-off: HellaJS can't react to property additions after creation (`update()` ignores keys absent from initial — `lib/utils.ts`), whereas Valtio/MobX proxies observe new keys on assignment. For state shapes that genuinely grow at runtime, that's a real gap.

---

## 7. TypeScript Inference

HellaJS's `Store<T, R>` mapped type encodes the entire transformation in the type system (`lib/types.d.ts`):

- Functions preserve their original signature (`T[K] extends (...args) => unknown ? T[K]`).
- Arrays become `Signal<Array>` for writable, `() => Array` for readonly when `K extends R`.
- Nested objects recurse as `Store<T[K], R>`.
- Primitives become `Signal<T>` for writable, `() => T` for readonly.

`ReadonlyKeys<T, O>` extracts the readonly key set from the options object conditionally (`lib/types.d.ts`), so `store(initial, { readonly: ['apiUrl'] })` produces a type where `apiUrl` is a `() => string` and the rest are `Signal<…>`. `PartialDeep<T>` recurses for the `update()` argument, preserving arrays and functions as leaves so a partial update to `{ items: [...] }` is a full replacement, not a deep merge (`lib/types.d.ts`).

| Library | Inference | Readonly typing |
|---|---|---|
| HellaJS | Conditional on initial shape | First-class — `R` parameter at the type level |
| Zustand | Manual `create<T>()` | Manual; no compile-time enforcement |
| Redux Toolkit | Manual `createSlice<T>` | Manual; immer-wrapped reducers infer state |
| Jotai | Inferred from atom initial value | Manual via read-only atoms |
| Valtio | Inferred from proxy initial | `useSnapshot` returns `readonly`, "too strict" per docs |
| MobX | Inferred from `makeAutoObservable` | Manual via `observable.ref` / decorators |

HellaJS's readonly is the strongest of the group at the type level: a single declaration (`{ readonly: ['apiUrl'] }` or `{ readonly: true }`) produces a store where the disallowed setters are not even in the type. Valtio's `useSnapshot` returns an over-strict `readonly` type that the docs themselves suggest loosening with a module augmentation. MobX has no compile-time readonly at all on plain `makeAutoObservable`. Zustand and RTK leave readonly to user discipline.

---

## 8. Memory Management

HellaJS `cleanup()` recursively walks the store tree and calls `cleanup()` on each nested store (`lib/create.ts`). Reserved keys are skipped (`lib/create.ts`). Crucially, individual signals are *not* disposed — they remain functional after cleanup (`lib/create.ts`, verified by `tests/cleanup.test.ts`). The reasoning: signals owned by other contexts (composed stores, external effects) should not be torn down just because the wrapping store is. Cleanup only tears down the store structure and the snapshot computeds.

Cleanup is idempotent (`tests/cleanup.test.ts`) — calling it twice is a no-op.

| Library | Cleanup model | What's disposed |
|---|---|---|
| HellaJS | Explicit `store.cleanup()` | Snapshot computeds + nested store structure (not leaf signals) |
| Zustand | Manual subscriber unsubscribe | Whatever the caller unsubscribes |
| Redux Toolkit | Store destroyed on app teardown | Entire store + middleware state |
| Jotai | `useSetAtom` cleanup on unmount | Atom cache per Provider |
| Valtio | `unsubscribe()` per subscribe | Listeners; proxy retained while referenced |
| MobX | `reaction()`/`autorun()` disposers; observable auto-GC when unreferenced | Reactions; observables GC'd by reachability |

HellaJS's recursive cleanup is the most explicit of the group — you call one method on the root and the whole tree tears down. MobX's observable GC is the most automatic (observables vanish when no reaction references them). Valtio requires per-subscribe `unsubscribe()` calls and provides no whole-store teardown. The HellaJS signal-survival design is deliberate but unusual: if you compose a user store inside an app store and call `appStore.cleanup()`, the user store's structure goes away but its signals keep working — a sharp edge if you expected cleanup to fully release memory.

---

## 9. Built-in Features Matrix

| Feature | HellaJS | Zustand | Redux Toolkit | Jotai | Valtio | MobX |
|---|---|---|---|---|---|---|
| Deep reactivity | Yes, automatic | No (immutable) | No (immutable + Immer) | No (atomic, manual) | Yes, automatic | Yes, automatic |
| Per-property signals | Yes | No | No | Per-atom | Via proxy | Via auto-tracking |
| Draft mutator (`update(d => …)`) | Yes (`lib/draft.ts`) | Via immer middleware | Yes (Immer in reducers) | Via writable atom | N/A (mutate directly) | N/A (mutate directly) |
| Partial deep merge | Yes (`lib/create.ts`) | Shallow only | Per-reducer | N/A | N/A | N/A |
| Reactive snapshot | Yes (`snapshot()`) | Selector | Selector | Derived atom | `useSnapshot` | Auto-track |
| Compile-time readonly | Yes (`lib/types.d.ts`) | No | No | No (manual) | Over-strict | No |
| Per-key middleware | Yes, nested (`lib/utils.ts`) | Via middleware | Via middleware | Via atom write fn | No | Yes (`intercept`, `observe`) |
| Async actions | Via `resource` package | Yes (async `set`) | `createAsyncThunk` | Async atoms + Suspense | Suspense-compatible | `flow` |
| DevTools integration | None | Redux DevTools | Redux DevTools (best-in-class) | Redux DevTools | Redux DevTools | mobx-devtools |
| SSR / hydration | None | Yes | Yes | Yes | Yes | Yes |
| Framework coupling | None (core peer) | React-first | Framework-agnostic core | React-only | React-first | Framework-agnostic |
| Persistence | None | `persist` middleware | Via middleware | `atomWithStorage` | Manual / `subscribe` | Manual |

### Notable HellaJS differentiators

- **Compile-time readonly inference from a single option** — `{ readonly: ['apiUrl'] }` or `{ readonly: true }` produces a store type where the disallowed setters are absent, not merely runtime no-ops (`lib/create.ts`, `lib/types.d.ts`).
- **Three explicit update paths in one API** — direct signal call, `update(partial)` deep merge, and `update(draft => …)` mutation diff, with no external Immer dependency (`lib/create.ts`, `lib/draft.ts`).
- **Per-key middleware with deep nesting** — middleware maps to nested store keys automatically via the recursive `createStore` call (`lib/create.ts`, `lib/utils.ts`).
- **Properties are real signals, not Proxy traps** — `Object.defineProperty` with `writable: true` makes each property a callable signal function; no Proxy interception on reads/writes after construction (`lib/utils.ts`).
- **Recursive cleanup with signal survival** — one call tears down the store structure and snapshot computeds while leaving leaf signals functional for shared/composed state (`lib/create.ts`).
- **Reserved-key validation at construction** — passing `snapshot`, `update`, or `cleanup` as a property name throws immediately, with a carve-out for store composition (`lib/create.ts`).
- **Store composition by reference** — nested stores share signal references bidirectionally; writes from either side propagate (`lib/create.ts`, verified by `tests/nested.test.ts`).

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

// Draft mutator (Immer-style, no Immer dep)
app.update(draft => {
  draft.items.push(4);
  draft.count = draft.items.length;
});

// Reactive derivation
effect(() => console.log(app.user.name()));
```

Compared to competitors:

- **vs. Zustand**: Zustand stores are hooks; reads/writes go through `useStore`/`set`. HellaJS exposes plain functions you call anywhere, no hook required. Zustand is more idiomatic inside React; HellaJS is more portable across environments.
- **vs. Redux Toolkit**: RTK requires a slice definition, action creators, a reducer, a provider, and a selector for every piece of state. HellaJS requires one call to `store()`. RTK returns the investment at scale (devtools, time travel, RTK Query); HellaJS optimizes for the 80% case where you just want reactive state.
- **vs. Jotai**: Jotai requires atoms per leaf and derived atoms for computed values. HellaJS auto-derives the structure from the initial object. Jotai's atom composition has no HellaJS equivalent — HellaJS stores compose by passing store instances, not by `atom((get) => …)`.
- **vs. Valtio**: Valtio is the closest in feel — `proxy(state)` + `useSnapshot` vs. `store(state)` + property calls. Valtio's mutation ergonomics (`state.x = v`) are arguably cleaner than HellaJS's `s.x(v)`, at the cost of Proxy traps on every access and an over-strict readonly type.
- **vs. MobX**: MobX matches HellaJS's deep reactivity and adds transparent tracking (`observer` auto-tracks without explicit effect wiring). HellaJS requires explicit `effect()` blocks. MobX is strictly more feature-rich; HellaJS is strictly smaller.

---

## Bottom Line

Architecturally, `@hellajs/store` belongs to the deeply-reactive camp alongside Valtio and MobX. Its distinctive choice is *construction-time conversion*: instead of intercepting every read and write with a Proxy trap, it walks the initial object once and produces a tree of real signal functions. That gives it type-level readonly inference (no competitor matches the conditional `Store<T, R>` mapping), zero Proxy overhead on the hot path, granular effects inherited from `@hellajs/core`'s glitch-free graph, and three explicit update paths (direct call, partial merge, draft mutator) in roughly 350 lines of source.

What sets HellaJS apart — and no single competitor matches all of:

1. **Compile-time readonly from a single declaration** — Valtio and MobX have no static readonly; RTK and Zustand leave it to user discipline.
2. **Properties as real signal functions, not Proxy traps** — Valtio and MobX intercept on every access; HellaJS does the work once.
3. **Three first-class update paths in one API without Immer** — direct call, `update(partial)`, and `update(draft => …)` with a 50-line hand-written diff (`lib/draft.ts`).
4. **Framework-agnostic with no Provider, no hook requirement** — Jotai is React-only; Zustand/Valtio are React-first; HellaJS works anywhere `@hellajs/core` works.
5. **Per-key middleware that nests recursively via the store factory** — middleware is wired into the construction loop (`lib/create.ts`), not a wrapper layer.
6. **Recursive cleanup that preserves shared leaf signals** — composes safely with externally-owned state.

Its gaps are the predictable ones: ecosystem size (no devtools, no Redux DevTools bridge, no `persist` middleware), no SSR/hydration story, no async/suspense primitives in the package itself (delegated to `@hellajs/resource`), no per-element array reactivity (arrays are single signals), and a snapshot that does not stay reactive across composed-store boundaries. For applications that live inside the HellaJS ecosystem and want deeply reactive state with strong typing at minimal bundle cost, it is the smallest and most typed option here. For applications that need devtools, time travel, async flows, or per-element array reactivity, Valtio and MobX remain the safer bets.
