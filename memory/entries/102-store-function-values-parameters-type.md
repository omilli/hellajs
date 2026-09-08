---
type: decision
title: Store function values with parameters type as Signal — the mapped function row misses them under strict contravariance; only zero-param functions preserve their type
description: Param-taking function values fall through store's Store function row (strict contravariance) and type as Signal<fn> while the runtime preserves them — use zero-param fns in tests/docs or cast.
tags: [store, types, contract]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [store-function-typing, signal-fn-row, strict-contravariance, param-function-preserved, store-test-authoring]
---

# Why

`Store<T, R>`'s first mapped branch is `T[K] extends (...args: unknown[]) => unknown ? T[K]`. Under `strictFunctionTypes`, a source function `(t: string) => string` is NOT assignable to that target (contravariance: `unknown` args cannot flow into a `string` param), so param-taking function values fall through every row and land on `Signal<T[K]>`. Zero-param functions (`() => string`) match trivially and type as preserved. The runtime (`createStore` init pass, `lib/internal/create.ts`) preserves ALL functions as-is via `isFunction`, so for param-taking values the type and the runtime disagree — the store property is the original function, not a signal.

What breaks if ignored: a test or doc example declaring `store({ onSave: (t: string) => t })` then calling `data.onSave("x")` compiles at runtime but fails tsc with TS2769/TS2345 (arg typed `(t: string) => string`), and `expect(...).toBe(fn)` fails against the `Signal<fn>` static type. The suite's established pattern is zero-param functions (`functions.test.ts`, `snapshot.test.ts` helper) or an explicit `Store<{...}>` annotation when inference needs pinning.

# Evidence

Verified 2026-09-08 in the store $-prefix rename run: reserved.test.ts scenario 2 initially used `const listen = (t: string) => t;` — `bunx tsc -p tsconfig.lint.json --noEmit` failed with exactly these errors (TS2769 `Signal<(t: string) => string>` overloads, TS2345 string-not-assignable); switching to `const listen = () => "listen"` types cleanly through the function row (`packages/store/lib/types.d.ts` `Store` mapped type, `packages/store/tests/functions.test.ts` zero-param precedent). Runtime preservation of the param-taking form is the `isFunction(value)` row in `createStore`'s init pass — behavior unchanged by the rename; 151 tests green.
