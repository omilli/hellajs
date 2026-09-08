---
type: decision
title: Store conditional type mappings do not distribute over X | undefined optional members
description: "PartialDeep/StoreMiddleware/StoreEquals/Store mappings test `X | undefined extends Array/Record`, which fails — optional members skip every recursion branch and stay leaf-typed."
tags: [arch, store, types]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [future-keys, partialdeep-optional-members, store-type-mappings, optional-undefined-union]
---
# Why

`T & Partial<F>` (the abandoned declared-`future` design, plans/store/code/store-audit/07-future-keys.md) made every future member `X | undefined`. Because the mappings in `packages/store/lib/types.d.ts` are non-distributive conditionals on the member type, a union with `undefined` fails the `extends unknown[]` / `extends Record<string, unknown>` guards and falls to the leaf branch — nested future keys could not get typed direct reads without shared-type surgery that would mistype initial stores (`store({ user: undefined as User | undefined })` is genuinely a signal at runtime).

Resolution (2026-09-08, operator decision): the auto-add design sidesteps the union entirely — `$update()` materializes unknown keys (store methods are $-prefixed since the 2026-09-08 rename) and returns `Store<Simplify<T & Omit<P, keyof T>>, R>`; added keys are NON-OPTIONAL members, so every mapping (`Store`, `Snapshot`, `PartialDeep`, `SettableKeyOf`) flows through them normally. The mapping limitation remains true and load-bearing: any future design that makes store members optional-with-object-type hits it again.

# Evidence

- Mapping source read this session: `packages/store/lib/types.d.ts` — `PartialDeep`, `StoreMiddleware`, `StoreEquals`, `SettableKeyOf`, `Store` all branch on bare `T[K] extends ...` with no `undefined` distribution.
- Declared-future failure reproduced: `bunx tsc -p tsconfig.lint.json --noEmit` → 6 union-blocks-branch errors in future.test.ts (29/143/146/148/155/162) while runtime suite was green (161 pass / 0 fail).
- Auto-add design probe-verified under `tsconfig.lint.json` (throwaway probe, deleted): nested adds map through the Record branch to nested `Store<…>`, chained adds accumulate, existing-key validation stays loud.
- Shipped green: `bun coverage store` exit 0 (2026-09-08, worktree plans-store-code-store-audit-07-future-keys).
