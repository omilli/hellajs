---
type: decision
title: Pre-declared optional store keys grow the same binding; reads are force-narrowed to ?.() calls
description: "Declaring future keys optional gives Solid-style same-binding growth; members type as Signal<X> | undefined so ?.() is the only safe read, and nested-object optionals are a compile-but-throw trap."
tags: [arch, store, types]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [predeclared-optional-keys, same-binding-growth, optional-chained-reads, materialization-effect-timing, declared-middleware-optional-keys]
---
# Why

`store<{ count: number; tags?: string[] }>({ count: 0 })` is the documented (docs/api/store.mdx Growing Stores) same-binding growth pattern: `$update({ tags: [...] })` materializes through the add-branch (the key is a known `T` member but absent at runtime), and no captured reference is needed. The cost structure was mapped by probe (2026-09-08, strict tsc on `lib/` + runtime against `dist/bundle.js`):

- The `Store<T>` mapped type is homomorphic, so optionality is preserved: `s.tags` is `Signal<string[]> | undefined`, NOT `Signal<string[] | undefined>`. Direct `s.tags()` is a type error pre-materialization (the type system blocks the runtime `TypeError` of calling an absent property); `s.tags?.()` is the only safe read and returns `undefined` before the first write, the value after.
- Nested-object optionals are a type trap (extends memory 100): `user?: { name: string }` maps to a leaf `Signal` union, so `n.user?.()` compiles but THROWS at runtime once materialized (the materialized value is a nested store, not callable), while the runtime-correct `n.user.name()` is a type error. Placeholder values or returned refs are the only typed nested paths.
- Effect timing: an effect reading `app.tags?.()` pre-materialization tracks nothing (property miss), so it does NOT re-run when the key materializes; `$snapshot()` effects do (keys-signal invalidation). Snapshot is the cross-materialization reactive seam.
- Declared `middleware`/`equals` entries APPLY to optional keys: `materializeKey` reads `options.middleware?.[key]` with no validation against the initial object (verified at runtime: entry runs at materialization and wraps later writes). "Added keys get no middleware" is true only for keys absent from the declared shape.

# Evidence

- Probes run 2026-09-08 (throwaway, deleted): strict tsc on a `lib/store` import (leaf optional accepted, `s.tags()`/`s.tags(["x"])` TS2722, `s.tags?.()` compiles; nested: `n.user?.name()` TS2349 via Function.name, `n.user?.()` compiles) and `bun -e` runtime probes from packages/store against `@hellajs/store/bundle` (pre-materialize direct call TypeError, `?.()` undefined; post-materialize `n.user` typeof object, `n.user?.()` TypeError; middleware entry running twice).
- Effect-timing probe: direct-read effect ran once across materialization; snapshot effect ran once per update including the add.
- Docs landed in worktree plans-store-docs-predeclared-optional-growth-predeclared-optional-growth (api/store.mdx Growing Stores, concepts/state.mdx Growing Shapes, patterns/state.mdx Declaring Future Keys); `bun doc-snippets` error-set diff vs baseline empty, `bun lint:guards` exit 0.
- Mapping source: `packages/store/lib/types.d.ts` `Store`/`PartialDeep` (non-distributive conditionals, homomorphic optionality preservation); `packages/store/lib/internal/create.ts` `materializeKey` (middleware/equals keyed by declared shape) and the `$update` add-branch.
