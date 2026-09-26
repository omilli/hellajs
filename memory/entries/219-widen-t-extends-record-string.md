---
type: decision
title: Widen `T extends Record<string, any>` to `object`, never to `Record<string, unknown>`
description: `Record<string, unknown>` rejects interface/class generics `Record<string, any>` accepts (no implicit index signatures) — a silent break; `object` preserves the caller set.
tags: [typescript, api-contract]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [no-explicit-any, generic-constraint, form-controller, backward-compatibility]
---
# Why

Fixing `no-explicit-any` on a generic constraint looks like a mechanical `any` → `unknown` swap, but `Record<string, any>` accepts interfaces and classes (the `any` index type satisfies the check) while `Record<string, unknown>` requires an index signature interfaces/classes do not carry implicitly. For template code shipped to users via `add` (e.g. `createForm<T extends …>`), that rejects caller types that compile today. `object` is the narrowest honest non-breaking shape; the internal `keyof T` indexing compiles unchanged.

# Evidence

Probe (`bunx tsc --ignoreConfig --noEmit --strict` over a scratch file): `fUnknown(i)` with `i: IFoo` (interface) → TS2345 "Index signature for type 'string' is missing"; `fUnknown<IFoo>` → TS2344; the same calls against `Record<string, any>` and `object` all pass. Applied to `form.tsx`/`form-html.ts` (`FormController` + `createForm`); `bun coverage ui` exit 0.
