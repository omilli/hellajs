---
applyTo: "packages/store/**"
---

<store-package>
Deeply reactive state over `@hellajs/core`. `store(initial)` walks a plain object and converts each property into a granular reactive primitive: primitives/arrays → signals, nested plain objects → nested stores, functions → preserved as-is. No proxies — store properties ARE the signals/stores, accessed directly.

## Files

| File | Role |
|---|---|
| `lib/index.ts` | Barrel — exports `store`, re-exports types |
| `lib/store.ts` | Public `store()` overloads; all delegate to `createStore` |
| `lib/internal/create.ts` | `createStore` factory: snapshot computed, `update`, `cleanup`, recursive init |
| `lib/internal/draft.ts` | `deepClone` + `extractChanges` — used only by the draft-mutator path |
| `lib/internal/utils.ts` | `reservedKeys` Set, `isObject`, `isStore`, `isObjectOrFunction`, `readDeep`, `applyUpdate`, `wrapWithMiddleware`, `defineStoreProperty` |
| `lib/types.d.ts` | `Store<T,R>`, `PartialDeep`, `StoreMiddleware`, `StoreOptions`, `ReadonlyKeys` |
| `lib/internal/core.ts` | Re-exports `signal`/`computed`/`isFunction`/`isPlainObject` + `Signal` type from core |

## `store()` overloads (`lib/store.ts`)

| Options | Return type |
|---|---|
| _none_ / `{ readonly?: false }` | `Store<T, never>` |
| `{ readonly: true }` | `Store<T, keyof T>` |
| `{ readonly: R }` | `Store<T, R[number]>` |
| `{ middleware }` | `Store<T, never>` |
| `{ readonly: R; middleware }` | `Store<T, R[number]>` |

## Property mapping — `Store<T, R>` (`lib/types.d.ts`)

For each key `K` of `T` (R = set of readonly keys, default `never`):

| `T[K]` shape | Writable (`K ∉ R`) | Readonly (`K ∈ R`) |
|---|---|---|
| function | `T[K]` (preserved) | `T[K]` (preserved) |
| array | `Signal<T[K]>` | `() => T[K]` |
| plain object | `Store<T[K], R>` | `Store<T[K], R>` |
| primitive | `Signal<T[K]>` | `() => T[K]` |

Plus built-ins: `snapshot: () => T`, `update: (PartialDeep<T> or (draft: T) => void) => void`, `cleanup: () => void`.

- **"plain object"** = a value `isPlainObject` returns true for (excludes arrays, `null`, functions, and class instances). `Date`/`Map`/`Set`/`RegExp`/custom instances fall into the primitive row → become a `Signal`, not a nested store.
- **R is threaded into nested object types but is inert** — top-level keys don't exist on nested types, so `K extends R` is never true there. The runtime also never passes `readonly` into recursive `createStore` calls. Nested stores are always writable regardless of what the type claims.

## `createStore` pipeline (`lib/internal/create.ts`)

Resolves: `readonlyAll = options.readonly === true`; `readonlyKeys = Array.isArray(options.readonly) ? options.readonly : []`; `middlewares = options.middleware`.

**snapshot** — a `computed` assigned to `result.snapshot`. Iterates cached `Object.keys(result)`, skips reserved keys, and for each key takes the FIRST matching branch: (1) `initial[key]` is a function → use the **original** `initial` value; (2) store value is a store (`isStore`) AND `initial[key]` is also a store (composition) → recurse via `readDeep` which reads every leaf signal inline, subscribing the parent computed to the full composed tree; (3) store value is a store but `initial[key]` is a plain object (auto-nested) → call `value.snapshot()`; (4) store value is a function → call `value()`. The computed subscribes to every signal it reads, so any property change re-runs it and re-flattens the whole tree. Reactive across composed store boundaries.

**update(partial)** — two paths:
- *Draft path* (`isFunction(partial)`): calls `this.snapshot()` (materializes the full snapshot), `deepClone`s it, runs `partial(draft)`, then `extractChanges(snapshot, draft)` produces the resolved partial.
- *Direct path*: uses `partial` as-is.

Then for each `[key, value]`: if `isPlainObject(value)` AND `current = this[key]` is a truthy object with `Object.hasOwn(current, "update")` → recurse via `current.update(value)`; otherwise `applyUpdate(current, value, middlewares, key)`. The recursion check uses `isPlainObject`, so partial arrays replace (no per-element merge).

**cleanup()** — defines and runs `deepCleanup(this)`: walks own keys, skips reserved, and for each object value either calls its own `cleanup` fn (nested stores) or recurses. Individual signals are functions, so they are **never disposed** — they keep working post-cleanup. Idempotent; does not null properties, the store object stays intact.

**Init pass** — iterates `Object.entries(initial)`:
- Reserved key (`snapshot`/`update`/`cleanup`): if `isStore(initial)` (composition) → skip silently; else throw `[store] createStore: reserved key collision, received "${key}"`.
- Function value → `defineStoreProperty` as-is.
- `isPlainObject` value → recurse `createStore(value, { middleware: nested } or undefined)`. Readonly is NOT passed down.
- Else (primitive/array) → `signal(value)`, optionally middleware-wrapped, then if readonly wrapped again as `computed(() => wrapped())`; assigned via `defineStoreProperty`.

`defineStoreProperty` uses `{ writable: true, enumerable: true, configurable: true }` — store properties can be externally reassigned, which drops reactivity.

## Composition (store-of-store)

Passing an existing store as a value inside another store's initial object: the nested store is `isPlainObject` (its object-literal base has `Object.prototype`), so the init pass recurses into `createStore(nestedStore)`. There `isStore(initial)` is true → the nested store's own `snapshot`/`update`/`cleanup` (reserved keys) are skipped rather than throwing, and its data properties (all signals = functions) are preserved as-is. The composed store gets fresh top-level methods but **shares every data signal reference** with the original — writes propagate bidirectionally. This is the mechanism behind `appStore.user.name("Bob")` also updating `userStore.name()`.

## `update()` gotchas

- **New keys silently ignored**: `applyUpdate` early-returns on falsy `target`; `this[key]` is undefined for keys absent from `initial`.
- **Reserved keys also ignored** by the same path — `update({ snapshot: ... })` cannot hijack the store.
- **`isPlainObject` gates deep-merge**: partial arrays are replaced, not element-merged.
- **Draft path materializes the snapshot** — calls `this.snapshot()`, subscribing the active reactive context (if any) to every signal.
- **Draft writes are not auto-batched**: each extracted change is a separate signal write; wrap `update(draft => ...)` in `batch()` to fire effects once.
- **`extractChanges` array equality is shallow `===` per element** (`lib/internal/draft.ts:68-80`). Because `deepClone` produces fresh references for object elements, arrays-of-objects in the draft are **always** considered changed (the whole array signal is rewritten) even when untouched. Primitive-only arrays compare by value.

## Middleware

- `StoreMiddleware<T>` maps each key to a transform fn, recursing into object values (nested middleware is passed to the nested store via `nestedOptions`).
- Runs on **set only**: `wrapWithMiddleware` returns `wrapped(value?)` — 0 args → `sig()`, 1 arg → `sig(middleware(value))`.
- Also applied through `update()` via `applyUpdate`'s per-key lookup.
- A middleware that **throws** rejects the write (propagates to caller); the signal is unchanged.
- Combines with readonly: the middleware-wrapped signal is further wrapped in `computed(() => wrapped())`.

## `deepClone` & `extractChanges` (`lib/internal/draft.ts`)

- **deepClone**: primitives/functions/`null`/`undefined` returned as-is; arrays mapped recursively; `Date` → `new Date(getTime())`; `RegExp` → `new RegExp(source, flags)`; `Map` → new map with **values** deep-cloned (keys kept by reference, not cloned); `Set` → new set with deep-cloned values; plain objects → own keys cloned. Custom class instances fall through to the plain-object branch — prototype is lost.
- **extractChanges**: iterates draft keys. Arrays → record whole array unless same length AND every element `===` original's. Plain objects → recurse, record only if nested changes exist. Primitives → record on `!==`.

## Other non-obvious behaviors

- **Reserved keys throw at create time** for any non-store-shaped `initial` and any value type (including functions); skipped silently when `isStore(initial)`.
- **Functions in snapshot**: snapshot stores the **original** `initial` function reference (`lib/internal/create.ts:49-50`), not the store property.
- **No cycle detection**: self-referential initial objects recurse until stack overflow; initial state must be a tree.
- **null/undefined** become signals like any primitive.
- **Readonly is creation-time only**: enforced via `computed(() => wrapped())` — the setter is a silent runtime no-op (computed ignores args), not a runtime check.
- **No proxies, no diffing on the hot path** — direct property access; only the draft path diffs.

## Testing

Tests live in `tests/` (10 files: `data`, `functions`, `update`, `snapshot`, `nested`, `cleanup`, `readonly`, `middleware`, `draft`, `reserved`) and import `store` from `@hellajs/store/bundle`. Reactive primitives (`signal`/`effect`/`computed`/`batch`/`flush`) import from `@hellajs/core`. Test helpers import from `@utils/test-helpers.js`. See `guides/tests.md` for the full rules.

- Cover each `update` path (partial, draft, middleware) independently.
- Snapshot reactivity tested flat and deeply nested.
- Cleanup: nested disposed, signals stay alive, idempotent.
- Readonly: setter is a runtime no-op; not inherited by nested.
- Track effect runs with `mock()` from `bun:test`.

Run with `bun coverage store`.

Style cross-refs: `guides/code.md` (source/types), `guides/tests.md` (tests), `guides/docs.md` (docs).
</store-package>
