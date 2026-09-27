---
type: decision
title: Pre-declared optional store keys grow the same binding; leaf types double-wrap undefined (Signal<X | undefined> | undefined), so ?.() stays the only safe read
description: Declare future keys optional for same-binding growth; members type Signal<X | undefined> | undefined, so ?.() is the only safe read and nested-object optionals are a compile-but-throw trap.
tags: [arch, store, types]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [predeclared-optional-keys, same-binding-growth, optional-chained-reads, materialization-effect-timing, declared-middleware-optional-keys, double-undefined-leaf]
supersedes: 106
---
# Why

`store<{ count: number; tags?: string[] }>({ count: 0 })` is the documented (docs/api/store.mdx Growing Stores) same-binding growth pattern: `$update({ tags: [...] })` materializes through the add-branch (the key is a known `T` member but absent at runtime), and since `tags` ∈ `keyof T` the `$update` return type `Store<Simplify<T & Omit<P, keyof T>>, R>` drops it from `P` — the original binding's type is never stale, so no captured reference is needed. Probe re-verified 2026-09-26 (strict tsc on `lib/` + runtime against `@hellajs/store/bundle`):

- Member type CORRECTS entry 106 (superseded): `s.tags` is `Signal<string[] | undefined> | undefined` — undefined wraps TWICE, not the `Signal<string[]> | undefined` 106 claimed via "homomorphic optionality preservation". The member stays optional, but `T[K]` = `X | undefined` fails every bare `extends` guard in the `Store` mapped type (entry 100's non-distributive mechanism) and falls to the leaf `Signal<T[K]>` branch: arrays never map to `SignalArray`, plain objects never to nested `Store`, at TYPE level. Runtime diverges (materialization wraps real SignalArray/nested-store values), so e.g. `s.tags!.push` type-errors while working at runtime. Reads: `s.tags()` is a member-level type error (TS2722/TS18048); `s.tags?.()` is the only safe read and yields `X | undefined` even after materialization; `s.tags!()` compiles but still types `X | undefined`.
- Nested-object optionals are a type trap (extends memory 100): `user?: { name: string }` maps to a leaf `Signal` union, so `n.user?.()` compiles but THROWS at runtime once materialized (the materialized value is a nested store, not callable), while the runtime-correct `n.user.name()` is a type error (TS2349 via Function.name). Placeholder values or returned refs are the only typed nested paths.
- Effect timing: an effect reading `app.tags?.()` pre-materialization tracks nothing (property miss), so it does NOT re-run when the key materializes; `$snapshot()` effects do (keys-signal invalidation). Snapshot is the cross-materialization reactive seam.
- Declared `middleware`/`equals` entries APPLY to optional keys: `materializeKey` reads `options.middleware?.[key]` with no validation against the initial object (verified at runtime: entry runs at materialization — the add-branch is a set, so it transforms the first value too — and wraps later writes). "Added keys get no middleware" is true only for keys absent from the declared shape.

# Evidence

- Type probe (2026-09-26, strict tsc on a throwaway `lib/store` import, deleted): compiler-quoted member type `Signal<string[] | undefined> | undefined` (assignment checks against `SignalArray<string[]>` and `Signal<string[]>` both rejected); `s.tags()` TS2722+TS18048; `s.tags?.()` compiles; `n.user?.()` compiles; `n.user?.name()` TS2349 `Type 'String' has no call signatures`.
- Runtime probe (2026-09-26, `bun -e` from packages/store): pre-materialize `Object.hasOwn(s, "tags") === false`, direct call TypeError, `?.()` undefined; post-`$update` the original reference reads `["x"]`; nested `typeof user === "object"`, `n.user?.()` TypeError, `n.user.name()` returns the value; middleware call count 1 at materialization and wraps the later write; direct-read effect ran once across materialization, snapshot effect twice.
- Mapping source: `packages/store/lib/types.d.ts` `Store` mapped type (bare non-distributive `T[K] extends` guards, leaf `Signal<T[K]>` fallthrough); `packages/store/lib/internal/create.ts` `materializeKey` (middleware/equals keyed by declared shape) and the `$update` add-branch (`materializeKey(key, value, true)` + `keysSignal` append). Mechanism cross-confirmed by entry 100 (non-distributive conditionals, refreshed 2026-09-26). Docs checked consistent: packages/store/docs/api/store.mdx Growing Stores ("reads are optional-chained", "typed string[] | undefined", nested-optional leaf-signal note).
