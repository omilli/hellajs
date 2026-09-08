---
type: fact
title: Composed store leaves type as Store<Store<...>> with function-typed members — method calls through the wrapper TS2769 while running fine
description: Calls through a composed wrapper (outer.inner.update({...})) TS2769 — composed leaves type as Store<Store<...>> with Signal members; runtime works, tests need @ts-expect-error on the call too.
tags: [store, types, testing]
timestamp: 2026-09-21
last_confirmed: 2026-09-21
triggers: [composed-wrapper-tests, store-typed-surface, ts-expect-error-signal, update-through-wrapper]
---
# Why

A composed store (`outer = store({ inner })`) types its leaf as the inner store's `Store<...>` shape, where every data member is `Signal<T>` (all members function-typed — packages/store/AGENTS.md §Composition says exactly this: "its composed type (`Store<Store<…>>`, all members function-typed)"). So `outer.inner.update({ value: 5 })` resolves `update`'s overloads against `PartialDeep<Store<{value: number}>>` — `value: 5` is not a `Signal<number>` — TS2769 "No overload matches this call", even though the runtime call is perfectly legal (the wrapper IS the inner store object; `SettableKeyOf = never` on the composed type is the related documented consequence).

Two traps compound it:

1. `bun test` and `bunx eslint` do not typecheck — the missing directive only fails the repo-wide `tsc` stage inside `bun coverage`, i.e. one gate later than every check a mid-flight iteration runs.
2. The natural assumption (made in plan unit 02-update-no-silent-drop, 2026-09-21) is that only the leaf assignment (`outer.inner.value = 42`) needs `@ts-expect-error`; the call site needs it too.

What breaks if ignored: a plan's test spec written from runtime knowledge alone ships without the call-site directive; the mid-flight checks (bundle, scoped test, eslint) all pass; the final `bun coverage` gate goes red on the test file, forcing an in-run fix that the plan contract did not anticipate.

# Evidence

Verified against the worktree run of plan unit 02 (`plans/store/code/store-audit/02-update-no-silent-drop.md`, 2026-09-21): the three new tests in `packages/store/tests/update.test.ts` passed under `bun test packages/store/tests --coverage` (exit 0) and `bunx eslint packages/store` (exit 0), then `bun coverage store` exited 2 with three TS2769 errors at the `outer.inner.update({ value: 5 })` lines ("Overload 2 of 3 ... Type 'number' is not assignable to type 'Signal<number>'"). Adding `@ts-expect-error` to the three update calls re-greened `bun coverage store` (150 pass / 0 fail, 100.00% funcs/lines). Runtime legality of the call: the composed leaf is the adopted store object itself (packages/store/lib/internal/create.ts — `isStore(initial)` branch preserves data properties as-is).
