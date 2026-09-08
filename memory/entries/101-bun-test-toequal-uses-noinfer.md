---
type: decision
title: bun:test toEqual uses NoInfer — asserting a runtime shape wider than a value's static type fails typecheck
description: "toEqual/toBe use NoInfer over the received value's static type — assert runtime-widened shapes through a widened reference or a received-value cast."
tags: [tests, store, types]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [toequal-noinfer, stale-ref-assertions, auto-add-widening, ts-expect-error-rot]
---
# Why

bun:test's `toEqual`/`toBe` declare `expected: T` and `expected: NoInfer<T>` overloads over the received value's static type. When the runtime shape is wider than the static type, the exact-shape argument fails both overloads (TS2769) — the assertion is correct at runtime but unrepresentable without help. Hit concretely in the store auto-add run: `expect(s.snapshot()).toEqual({ count: 0, tags: ["a"] })` where `s`'s type predates the add.

Fixes, in preference order:
1. Assert through a WIDENED reference (`s1.snapshot()` where `s1 = s.update({ tags })` — same object, wider type).
2. Cast the received value when only a stale ref exists: `expect(s.snapshot() as Record<string, unknown>).toEqual(…)`.
3. `expect(widened as unknown as typeof narrow).toBe(narrow)` for identity asserts across the widening.

Related rot in the same run: `@ts-expect-error` directives on update calls with reserved names or nested-store keys went UNUSED (TS2578) once `P` began capturing those keys — v2 directives asserting the old closed-partial type errors must be removed (the runtime throw stays the contract, matching the readonly-guard idiom).

# Evidence

- 11 tsc errors in the auto-add run, all this shape: future.test.ts:18/26/37/67/91, update.test.ts:33, persist.test.ts:172 (TS2769 NoInfer) + reserved.test.ts:36/44, snapshot.test.ts:198, update.test.ts:71 (TS2578 unused directives). Fixed with the three patterns; `bun coverage store` exit 0 after.
