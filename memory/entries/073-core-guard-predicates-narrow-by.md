---
type: decision
title: Core guard predicates narrow by assignability, not typeof-kind — they cannot replace typeof-narrowing on function-typed unions; escapes are the explicit signature cast and the `in` operator
description: Core guards narrow by assignability, not typeof-kind — on value|function unions isFunction keeps both arms (contravariance); escape via the signature cast, or `in` for function-vs-spec-object unions.
tags: [arch, core, types]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [guard-narrowing, isfunction-conversion, typeof-ban-conversion, union-discriminator]
---
# Why

The typeof ban (guides/code.md §Type guards, eslint `no-restricted-syntax`) assumes every `typeof`-vs-literal comparison converts to a core guard. Two classes don't, for a type-system reason, not a style one:

1. **Value-vs-function option unions** (`retry: number | boolean | Fn`, `updater: T | ((old: T | undefined) => T)`): raw `typeof x === "function"` narrows by typeof-kind and picks the exact function arm. `isFunction`'s predicate (`value is (...args: unknown[]) => unknown`) filters by assignability — a function arm with specific params is NOT assignable to `(...args: unknown[]) => unknown` (contravariance: `unknown` ↛ `T | undefined`), so TS keeps the arm in the false branch and intersects it with the value arm in the true branch. Both ternary arms poison. Escape: keep the guard call (satisfies the ban) and cast the narrowed arm to its specific signature — the idiom resource already used at these exact sites (`(updater as (old: T | undefined) => T)(entry.data)`).
2. **Function-vs-spec-object unions** (`handler: EventListener | DirectListenerSpec` in dom's `setDirectHandler`): no core guard discriminates at all — `EventListener` (call-signature interface) is assignable to `object` (isObject keeps both members) AND survives `isFunction`'s false branch (interface param bivariance). Escape: `"handler" in handler` — narrows exactly, reads as duck-typing, and is eslint-ban-clean.

A core-side fix (widening the predicate signature) does not exist without `any`: even `(...args: never[]) => unknown` params stop the failures but the `unknown` return still fails assignment into specific-signature targets. Ignoring this re-derives the full tsc-failure dance (TS2339/TS2322/TS2345 across both branches) on every future ban extension — e.g. converting ssr (currently exempt) would hit class 1 immediately in `resolve.ts`/`walk.ts`.

Distinct from memory 037 (isFunction as the RUNTIME reactivity discriminator — runtime semantics); this entry is the TYPE-level narrowing mechanics.

# Evidence

Verified 2026-09-01, plans/core/code/type-guards units 03–04: `isObject(handler)`/`!isFunction` in dom's setDirectHandler → TS2339 (negation also breaks aliased-predicate narrowing); raw `isFunction(updater)`-style conversions in resource → TS2322/TS2345; fixed by casts, `bun coverage resource` and `bun coverage dom` exit 0 (252/402 pass). Re-verified 2026-09-26 against current tree — claim holds; paths moved: packages/core/lib/internal/utils.ts:6 (`isFunction` predicate); cast escapes at packages/resource/lib/resourceCache.ts:186, internal/retry.ts:32,35, internal/polling.ts:57,75, resource.ts:431 (cache.ts → resourceCache.ts, retry/polling → internal/); `"handler" in handler` at packages/dom/lib/internal/events.ts:88; guides/code.md §Type guards now states the narrowing rule + `in` escape verbatim; eslint typeof ban exempts `packages/ssr/lib/**` (resolve.ts/walk.ts still raw typeof).
