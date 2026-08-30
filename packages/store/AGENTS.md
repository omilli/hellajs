<store-package>
Deeply reactive state over `@hellajs/core`. `store(initial)` walks a plain object and converts each property into a granular reactive primitive: primitives/arrays → signals, nested plain objects → nested stores, functions → preserved as-is. No proxies — store properties ARE the signals/stores, accessed directly.

## Files

| File | Role |
|---|---|
| `lib/index.ts` | Barrel — exports `store`, re-exports types |
| `lib/store.ts` | Public `store()` overloads; all delegate to `createStore` |
| `lib/internal/create.ts` | `createStore` factory: snapshot computed, `update`, `cleanup`, `subscribe`, recursive init |
| `lib/internal/draft.ts` | `deepClone` + `structurallyEqual` + `extractChanges` — used only by the draft-mutator path |
| `lib/internal/utils.ts` | `reservedKeys` Set, `isStore`, `isObjectOrFunction`, `applyUpdate`, `wrapWithMiddleware`, `defineStoreProperty` |
| `lib/types.d.ts` | `Store<T,R>`, `SettableKeyOf<T>` (non-exported, subscribe-only), `PartialDeep`, `StoreMiddleware`, `StoreOptions`, `ReadonlyKeys` |
| `lib/internal/core.ts` | Re-exports `signal`/`computed`/`effect`/`untracked`/`isFunction`/`isPlainObject`/`isObject` + `Signal` type from core |

## `store()` overloads (`lib/store.ts`)

| Options | Return type |
|---|---|
| _none_ / `{ readonly?: false }` | `Store<T, never>` |
| `{ readonly: true }` | `Store<T, keyof T>` |
| `{ readonly: R }` | `Store<T, R[number]>` |
| `{ middleware }` | `Store<T, never>` |
| `{ readonly: R; middleware }` | `Store<T, R[number]>` |
| any of the above + `equals` | same as the base shape — `equals?: StoreEquals<T>` never changes the return type |

## Property mapping — `Store<T, R>` (`lib/types.d.ts`)

For each key `K` of `T` (R = set of readonly keys, default `never`):

| `T[K]` shape | Writable (`K ∉ R`) | Readonly (`K ∈ R`) |
|---|---|---|
| function | `T[K]` (preserved) | `T[K]` (preserved) |
| array | `Signal<T[K]>` | `() => T[K]` |
| plain object | `Store<T[K]>` | `K ∈ R ? Store<T[K], keyof T[K]> : Store<T[K]>` |
| primitive | `Signal<T[K]>` | `() => T[K]` |

Plus built-ins: `snapshot: () => Snapshot<T>` (composed nested stores unwrap to their data types), `update: (PartialDeep<T> or (draft: Snapshot<T>) => void) => void`, `cleanup: () => void`, `subscribe: <K extends SettableKeyOf<T>>(key: K, callback: (next: T[K], prev: T[K]) => void) => () => void`.

- **"plain object"** = a value `isPlainObject` returns true for (excludes arrays, `null`, functions, and class instances). `Date`/`Map`/`Set`/`RegExp`/custom instances fall into the primitive row → become a `Signal`, not a nested store.
- **`R` propagates into nested plain objects, not composed stores** — a plain-object key under `R` is typed `Store<T[K], keyof T[K]>`: each nested level derives its own full key set, so no name-collision false lockdown (the reverted design threaded the parent's `R` down verbatim, typing a nested key readonly merely for sharing a name with a top-level readonly key — near-guaranteed under `readonly: true`, where `R = keyof T`). Composed stores pass through with their own config: their data properties are function-typed and land in the function-preservation row regardless of `R`, matching adoption semantics at the runtime.

## `createStore` pipeline (`lib/internal/create.ts`)

Resolves: `readonlyAll = options.readonly === true`; `readonlyKeys = Array.isArray(options.readonly) ? options.readonly : []`; `middlewares = options.middleware`; `equalsOptions = options.equals`.

**snapshot** — a `computed` defined non-writable as `result.snapshot` (return type `Snapshot<T>`). Iterates cached `Object.keys(result)`, skips reserved keys, and for each key takes the FIRST matching branch: (1) `initial[key]` is a function AND the key is not settable (a preserved user function) → use the **original** `initial` value — the settable-keys registry is the discriminator, since under composition `initial`'s signal properties are functions too; (2) store value is a store (`isStore`) → delegate to `value.snapshot()`, chaining computeds so the parent subscribes to the nested snapshot and through it to the full composed tree; (3) store value is a function → call `value()`; (4) anything else (externally replaced plain values) → mirror as-is. The computed subscribes to every signal it reads (directly or through chained nested snapshot computeds), so any property change re-runs it and re-flattens the whole tree. Reactive across composed store boundaries; composed leaves unwrap to plain values.

**update(partial)** — two paths:
- *Draft path* (`isFunction(partial)`): calls `this.snapshot()` (materializes the full snapshot), `deepClone`s it, runs `partial(draft)`, then `extractChanges(snapshot, draft)` produces the resolved partial.
- *Direct path*: uses `partial` as-is.

Then for each `[key, value]`: if `isPlainObject(value)` AND `current = this[key]` is a truthy object with `Object.hasOwn(current, "update")` → recurse via `current.update(value)`; if `settableKeys.has(key)` → `applyUpdate(current, value, middlewares, key)`; otherwise **throw**, reason selected in order: reserved key → `[store] update: reserved key "<key>"`; own function key of `initial` → `"<key>" is a function property, not state — assign it directly`; object with own `update` (store key given a non-object value) → `store key "<key>" requires an object value`; else `unknown key "<key>"`. The throw fires at the first offending key in partial-key order — earlier keys are already applied (no atomicity). The recursion check uses `isPlainObject`, so partial arrays replace (no per-element merge).

**cleanup()** — defines and runs `deepCleanup(this)`: walks own keys, skips reserved, and for each object value either calls its own `cleanup` fn (nested stores) or recurses. Individual signals are functions, so they are **never disposed** — they keep working post-cleanup. Idempotent; does not null properties, the store object stays intact.

**subscribe(key, callback)** — thin wrapper over a core `effect`: gates on `settableKeys` (throws `[store] subscribe: "<key>" is not a settable key` for nested-store keys, function props, reserved keys, unknown keys), reads `result[key]` inside the effect. The effect's immediate first run is suppressed via a `started` flag (captures the initial value into `prev`); later runs fire `callback(next, prev)` inside `untracked` so cb-internal signal reads never widen the subscription, then update `prev`. The wrapper returns nothing (a function-returning user cb can't be captured as effect cleanup). Returns the core effect disposer — double-unsubscribe safe, and registerable with an outer `scope()` via core's `addScopeEffect`. Equality-skipped writes never re-run the effect. Readonly keys are in the registry — subscribing is legal read-only observation that never fires. Impl note: the impl generic is `<K extends keyof T>` (assignable to the declared `<K extends SettableKeyOf<T>>`; `& string` is NOT — TS can't prove the deferred conditional string-only for generic `T`), with one `key as string` cast at the `Set<string>` registry boundary.

**Init pass** — iterates `Object.entries(initial)`:
- Reserved key (`snapshot`/`update`/`cleanup`/`subscribe`): if `isStore(initial)` (composition) → skip silently; else throw `[store] store: reserved key collision, received "${key}"`.
- Function value → `defineStoreProperty` as-is (writable — the function-swap contract).
- `isPlainObject` value → recurse `createStore(value, nestedOptions)`, defined `writable: false` — `nestedOptions` carries the nested middleware, the nested equals, and, when `readonlyAll` or the key is listed, `readonly: true` (deep propagation). A composed store reached on this path ignores the threading: its `isStore(initial)` adoption preserves signals verbatim, so it keeps its own readonly/writable config.
- Else (primitive/array) → `signal(value)` with an optional per-key write-equality comparator from `options.equals` — `'structural'` maps to `structurallyEqual`, a function passes through, any other value throws `[store] store: equals for "<key>" must be a function or "structural", received …` at create time — optionally middleware-wrapped; readonly keys get an arity-0 guard `function (...args) { if (args.length > 0) throw new Error('[store] readonly key "<key>"'); return ro(); }` wrapping `computed(() => wrapped())` — reads are unchanged (`key.length === 0`), any write call throws. All leaf props are defined `writable: false`.

The four store methods (snapshot/update/cleanup/subscribe) are defined via the same non-writable descriptor (spying on them in tests requires `Object.defineProperty` — `configurable: true` stays). `defineStoreProperty` uses `{ writable, enumerable: true, configurable: true }` — signal-backed leaves, readonly guards, nested stores, and methods are non-writable (strict-mode reassignment throws TypeError); preserved functions (including adopted composed-store signals) stay writable.

## Composition (store-of-store)

Passing an existing store as a value inside another store's initial object: the nested store is `isPlainObject` (its object-literal base has `Object.prototype`), so the init pass recurses into `createStore(nestedStore)`. There `isStore(initial)` is true → the nested store's own `snapshot`/`update`/`cleanup` (reserved keys) are skipped rather than throwing, and its data properties (all signals = functions) are preserved as-is. The composed store gets fresh top-level methods but **shares every data signal reference** with the original — writes propagate bidirectionally. This is the mechanism behind `appStore.user.name("Bob")` also updating `userStore.name()`. Subscription follows the same ownership: `appStore.subscribe("user", …)` throws (`user` is a nested-store key, absent from the parent's registry), and while the adopted reference `appStore.user` carries the threaded registry at runtime, its composed type (`Store<Store<…>>`, all members function-typed) yields `SettableKeyOf = never` — subscribe on the owning store instance (`userStore.subscribe`), which types cleanly.

## `update()` gotchas

- **Every out-of-contract write throws** — no silent drops. `applyUpdate` runs only for registry keys; the update loop throws on the first offending key (partial application of earlier keys stands). Four direct-path reasons (reserved / function property / store-key-non-object / unknown) plus `[store] readonly key` from the readonly guard when `update()` targets a readonly key (readonly keys ARE settable — the guard is the throw site). The draft path inherits all of them through `extractChanges`.
- **update() writes only settable keys** — each store tracks its signal-backed keys in a non-enumerable registry (`settableRegistry` symbol, `lib/internal/create.ts`); unknown keys, reserved keys, and preserved user functions are never in it, so `update({ snapshot: ... })` cannot hijack the store and `update({ onSave: fn })` throws without invoking the function. Composition threads the source store's registry so composed leaves stay writable. Functions swap via direct assignment.
- **`isPlainObject` gates deep-merge**: partial arrays are replaced, not element-merged.
- **`extractChanges` compares structurally** (`lib/internal/draft.ts`). Arrays, Dates, Maps, Sets, RegExps, and class instances compare by content — untouched values are never rewritten and their subscribers do not fire; mutated values are recorded as the draft clone.
- **Draft path materializes the snapshot** — calls `this.snapshot()`, subscribing the active reactive context (if any) to every signal.
- **Draft writes are not auto-batched**: each extracted change is a separate signal write; wrap `update(draft => ...)` in `batch()` to fire effects once.
- **`extractChanges` array equality is structural per element** — equal-content arrays are skipped; only genuinely changed arrays rewrite the whole array signal. Primitive-only arrays compare by value.

## Middleware

- `StoreMiddleware<T>` maps each key to a transform fn, recursing into object values (nested middleware is passed to the nested store via `nestedOptions`).
- Runs on **set only**: `wrapWithMiddleware` returns `wrapped(value?)` — 0 args → `sig()`, 1 arg → `sig(middleware(value))`.
- Also applied through `update()` via `applyUpdate`'s per-key lookup.
- A middleware that **throws** rejects the write (propagates to caller); the signal is unchanged.
- Combines with readonly: the middleware-wrapped signal is further wrapped in `computed(() => wrapped())`.
- Combines with `equals` on the same key: the comparator runs **inside the signal, after middleware** — it sees the transformed value (`wrapWithMiddleware` writes `sig(mw(value))`), and every write path (direct call, `update(partial)`, draft) inherits it.

## `deepClone` & `extractChanges` (`lib/internal/draft.ts`)

- **deepClone**: primitives/functions/`null`/`undefined` returned as-is; arrays mapped recursively; `Date` → `new Date(getTime())`; `RegExp` → `new RegExp(source, flags)`; `Map` → new map with **values** deep-cloned (keys kept by reference, not cloned); `Set` → new set with deep-cloned values; other objects (plain or class instances) → own keys cloned onto `Object.create(getPrototypeOf(obj))` — class instances keep their prototype.
- **`extractChanges`: iterates draft keys. Arrays, built-ins, and objects compare via `structurallyEqual` (content equality); plain-object pairs recurse, recording only if nested changes exist.**

## Other non-obvious behaviors

- **Reserved keys throw at create time** for any non-store-shaped `initial` and any value type (including functions); skipped silently when `isStore(initial)`.
- **Functions in snapshot**: snapshot stores the **original** `initial` function reference (`lib/internal/create.ts`), not the store property — a swapped-in replacement (`data.onSave = fn`) is not what `snapshot()` returns.
- **No cycle detection**: self-referential initial objects recurse until stack overflow; initial state must be a tree.
- **null/undefined** become signals like any primitive.
- **Readonly is creation-time config, runtime-enforced by a throwing guard**: the arity-0 wrapper around `computed(() => wrapped())` returns the value on read and throws `[store] readonly key "<key>"` on any write call (setter call or `update()`). Propagates deep into nested plain objects; composed stores keep their own config.
- **Data properties and methods are non-writable**: external reassignment (`store.count = 5`, `store.cleanup = fn`) throws TypeError in strict-mode ESM. Function-valued props are the exemption — including a composed store's adopted signal functions (`parent.user.name = fn` stays possible); the function-writability rule is the documented contract. `configurable: true` stays, so `Object.defineProperty` redefinition (test spies) works.
- **No proxies, no diffing on the hot path** — direct property access; only the draft path diffs.

## Testing

Tests live in `tests/` (11 files: `data`, `functions`, `update`, `snapshot`, `nested`, `cleanup`, `readonly`, `middleware`, `draft`, `reserved`, `subscribe`) and import `store` from `@hellajs/store/bundle`. Reactive primitives (`signal`/`effect`/`computed`/`batch`/`flush`) import from `@hellajs/core`. Test helpers import from `@utils/test-helpers.js`. See `guides/tests.md` for the full rules.

- Cover each `update` path (partial, draft, middleware) independently.
- Snapshot reactivity tested flat and deeply nested.
- Cleanup: nested disposed, signals stay alive, idempotent.
- Readonly: setter calls and `update()` throw; propagates deep into nested plain objects (composed stores keep their own config).
- Track effect runs with `mock()` from `bun:test`.

Run with `bun coverage store`.

Style cross-refs: `guides/code.md` (source/types), `guides/tests.md` (tests), `guides/docs.md` (docs).
</store-package>
