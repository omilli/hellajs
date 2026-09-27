---
type: correction
title: Composed store $update through the wrapper typechecks clean — only the leaf assignment needs @ts-expect-error
description: Composed leaves still type Store<Store<…>> with Signal members — only the leaf assignment needs @ts-expect-error; $update through the wrapper typechecks clean.
tags: [store, types, testing]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [composed-wrapper-tests, store-typed-surface, ts-expect-error-signal, update-through-wrapper]
supersedes: 104
---
# Why

Supersedes the claim that `outer.inner.$update({ value: 5 })` errors TS2769 and needs a call-site `@ts-expect-error`. That stopped holding once `$update` became an overload object (16985376): on a composed leaf, `$update` resolves against the intersection of the leaf's mapped surface and its store methods, and the mapped surface preserves the adopted inner store's own function-typed members as-is (`packages/store/lib/types.d.ts`, `Store` mapped type, function branch) — so the adopted store's own `$update`, typed against the **plain** data shape, is offered first and `{ value: 5 }` matches it. The outer-level signature (`PartialDeep<Store<…>>`, which does demand `Signal<number>`) sits behind it in the overload list and is never reached.

What did NOT change: the composed leaf still types `Store<Store<…>>` with `Signal`-typed members — `outer.inner.value = 42` still errors TS2322 without a directive, and `SettableKeyOf = never` still holds (subscribe on the owning store instance). The gate-timing trap also remains, now in both directions: `bun test` and `eslint` don't typecheck, so these errors surface only at the repo-wide tsc stage inside `bun coverage` — a missing directive fails TS2322, a **stale** directive fails TS2578 "Unused '@ts-expect-error' directive".

What breaks if ignored: a test spec written from the superseded entry adds call-site directives that are now unused, and the `bun coverage` tsc gate goes red on TS2578 — the inverse of the failure the directive was avoiding.

# Evidence

- `bunx tsc -p tsconfig.lint.json --noEmit` exits 0 with three **undirected** `outer.inner.$update({ value: 5 })` calls (`packages/store/tests/update.test.ts:307,319,335`; tests are in the lint include via `packages/*/tests/**/*.ts`).
- Type probe (scratch file under `packages/store/tests/`, removed after): `typeof outer.inner` prints `Store<Store<{ value: number; count: number; }, never>, never>`; `outer.inner.value = 42` errors TS2322 `number` not assignable to `Signal<number>`; `PartialDeep<typeof outer.inner>` rejects `{ value: 5 }` (TS2322) while `outer.inner.$update({ value: 5 })` is silent, its first overload printed as `PartialDeep<{ value: number; count: number; }> & P` — the plain data shape, reachable only through the adopted store's preserved member.
- Call-site directives were dropped in a1b2e65d (`feat(store)!: rename store methods to $-prefix`, which also renamed `update` → `$update`); leaf-assignment directives (`packages/store/tests/update.test.ts:302,316,331`) remain and are load-bearing under green tsc. `packages/store/AGENTS.md` §Composition still documents `Store<Store<…>>`, all members function-typed, and `SettableKeyOf = never`.
