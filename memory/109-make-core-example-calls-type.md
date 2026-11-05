---
title: Make core-example calls type-invalid via wrong-typed EqualsOptions, never arity - signal has a 2-arg overload
description: "`signal(1, 2)` fails tsc with TS2559 (2 has no properties in common with EqualsOptions<number>), not an arity error — `signal<T>(initialValue, options)` absorbs extra positional args, so type-invalid probe/Incorrect examples must use a wrong-typed second argument."
tags: [core, signal, tsc, typecheck-probe, incorrect-examples, overloads]
confirmed: 2026-02-05
---

# Why

When a verification probe or an intentionally-wrong example needs a `@hellajs/core` call that FAILS typecheck (bad-example gates, Incorrect-fence red checks), an extra positional argument does not produce "Expected 1 arguments" — `signal` declares `signal<T>(): Signal<T | undefined>`, `signal<T>(initialValue: T): Signal<T>`, AND `signal<T>(initialValue: T, options: EqualsOptions<T>): Signal<T>`, so `signal(1, 2)` binds the 2-arg overload and fails on the argument TYPE instead: `TS2559: Type '2' has no properties in common with type 'EqualsOptions<number>'`. Related API-shape trap when authoring the VALID side: the returned signal is a callable accessor (read `count()`, write `count(next)`) — there is no `.get()`/`.set()` (`TS2339: Property 'get' does not exist on type 'Signal<number>'`).

# Evidence

- Overloads read at `packages/core/lib/signal.ts` (three signatures; implementation `signal<T>(initialValue?: T, options?: EqualsOptions<T>)`).
- Throwaway tsc probe (2026-02-05, repo tsconfig shape with `@hellajs/core` path-mapped): module `import { signal } from "@hellajs/core"; const count = signal(1, 2);` reds `probe.ts(3,25): error TS2559: Type '2' has no properties in common with type 'EqualsOptions<number>'`.
- Same run, wrong read API: `count.get()` reds `TS2339: Property 'get' does not exist on type 'Signal<number>'`; the callable form `const current = count();` is clean.
