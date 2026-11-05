---
title: A composed store key rejects plain-object partials in type space; update through the owning store
description: "AppStore.$update({ user: { name } }) over a composed key (user holds a nested store) fails TS2769 because PartialDeep never unwraps Store members - the runtime accepts it, but typed writes go through the owning store or the shared property signals."
tags: [store, composition, PartialDeep, TS2769, best-practices-skills, fences]
confirmed: 2026-11-04
---

# Why

`PartialDeep<T>` recurses only through values matching `Record<string, unknown>` and has no Store unwrap, so for `T = { user: Store<{ name: string }> }` the partial for `user` must be the Store itself - a plain `{ name: "Grace" }` fails overload resolution (TS2769) even though the runtime deep-merges it correctly (`$update` recurses whenever the value is a plain object and the current property has own `$update`). Typed updates across a composed store go through the store that owns the key: `userStore.$update({ name: "Grace" })`, or the shared-signal path `appStore.user.name("Grace")` (writes propagate both directions either way). Same ownership rule as `$subscribe`, which throws outright on nested-store keys.

# Evidence

- `packages/store/lib/types.d.ts PartialDeep` (recursion gated on `T[K] extends Record<string, unknown>`, no Store arm) and `packages/store/lib/internal/create.ts` `$update` recursion branch (`isPlainObject(value) && Object.hasOwn(current, "$update")` -> `current.$update(value)`) read in-repo.
- tsc (2026-11-04): `.skills-snippets/store-best-practices_shape-compose-stores.ts(19,20) TS2769: No overload matches this call` on `appStore.$update({ user: { name: "Grace" } })`; routing the write through the owning store re-ran the full skills-check corpus green (165 blocks, 0 findings).
