---
title: Store function properties type as preserved only when their signature accepts unknown args
description: "A function property in store({...}) gets the preserved (swappable, directly callable) typing only when assignable to (...args: unknown[]) => unknown - zero-arg handlers qualify, a narrower-parameter handler types as Signal<fn> and blocks assignment."
tags: [store, functions, typing, Signal, best-practices-skills, fences]
confirmed: 2026-11-04
---

# Why

`Store<T>`'s property mapping gates the function branch on `T[K] extends (...args: unknown[]) => unknown`. Parameter contravariance means a handler like `(text: string) => void` is NOT assignable to that shape (its parameter cannot accept `unknown`), so the conditional falls through to the signal branch and the property types as `Signal<(text: string) => void>` - while the runtime still preserves the function as-is (`materializeKey`'s isFunction branch defines it verbatim, never a signal). Consequences: `store.onSave = fn` reds TS2322 against the Signal typing, and the type no longer matches the runtime shape. Zero-argument handlers always pass the gate; handlers whose parameters accept `unknown` pass too. The package's own examples and tests use zero-arg handlers for exactly this reason (`double: () => number`; the swap test types `onSave: () => string`). Declare swappable function properties zero-arg (or unknown-accepting) in stores and in any typechecked doc/skill fence.

# Evidence

- `packages/store/lib/types.d.ts Store` property mapping (conditional `T[K] extends (...args: unknown[]) => unknown ? T[K] : ... Signal<T[K]>`) and `packages/store/lib/internal/create.ts materializeKey` (isFunction branch preserves as-is) read in-repo.
- tsc (2026-11-04): `.skills-snippets/store-best-practices_shape-functions-preserved.ts(16,1) TS2322: Type '(text: string) => void' is not assignable to type 'Signal<(text: string) => void>'`; retyping the fence's handler zero-arg re-ran the full skills-check corpus green (165 blocks, 0 findings).
