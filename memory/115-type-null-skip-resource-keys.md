---
title: Type null-skip resource keys by widening the fetcher parameter
description: "A resource key that can be null (the skip-fetch gate) only typechecks when the fetcher's parameter type includes null too - K is inferred from the fetcher, and `key: () => number | null` against a `(id: number)` fetcher fails TS2769 in skills-check fences."
tags: [resource, key, null, generics, skills-check, fences, best-practices-skills]
confirmed: 2026-11-04
---

# Why

`resource<T, K = undefined>` infers K from the fetcher's parameter: `(id: number) => Promise<T>` pins K to `number`, so an option `key: () => userId()` over `signal<number | null>` passes `number | null` where `K` (`number`) is expected - TS2769 "No overload matches this call". The null-skip behavior (fetches skipped while an explicit key resolves to null/undefined) needs the null in K, and the only way in is the fetcher signature: declare `(id: number | null) => Promise<T>` (the fetcher never actually receives null while the gate holds; the package's own test for this behavior types the fetcher `(id: number | undefined)` with a `signal<number | undefined>`). Applies to `resource()` call sites and typechecked doc/skill fences alike.

# Evidence

- `packages/resource/lib/resource.ts resource` (K inferred from `Fetcher<T, K>` = `(key: K) => Promise<T>`) and `packages/resource/tests/fetching.test.ts` test "skips fetch when key is undefined or null" (`signal<number | undefined>` + `(id: number | undefined)` fetcher), read in-repo.
- `vp run skills-check` (2026-11-04): `.skills-snippets/resource-best-practices_res-reactive-key-fetch.ts(15,3) TS2769: No overload matches this call`; retyping the fence's fetcher to `(id: number | null)` re-ran the corpus green (120 blocks, 0 findings).
