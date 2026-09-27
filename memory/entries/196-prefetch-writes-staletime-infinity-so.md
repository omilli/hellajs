---
type: decision
title: prefetch writes `staleTime ?? Infinity` so prefetched entries never fire SWR
description: prefetch passes `staleTime ?? Infinity` to setCacheData (not the raw option); SWR fires only for a resource with explicit staleTime — the coalesce keeps it from refetching the prefetched entry.
tags: [resource, cache]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [prefetch, staleTime, swr]
supersedes: 002
---
# Why

`resourceCache.prefetch` (`packages/resource/lib/resourceCache.ts:430`) stores its result via `setCacheData(fetcher, normalizedKey, result, cacheTime, staleTime ?? Infinity)`. The `?? Infinity` coalesce is load-bearing, not decorative: `setCacheData` (`resourceCache.ts:109`) defaults `staleTime` to `0` (always stale — confirmed in `docs/api/resourcecache.mdx`), while `Infinity` means never stale (`isStale`, `resourceCache.ts:69-72`).

The SWR firing condition (`packages/resource/lib/resource.ts:221`) is `staleTime !== undefined && isStale(entry) && revalidateOnStale` — it fires ONLY when the consuming resource explicitly configures `staleTime` (that guard has existed since the original SWR commit, d9107306). So:
- Consumer without explicit `staleTime` (e.g. `resource(fetcher, { key, cacheTime })`): SWR never fires regardless of entry staleness — the coalesce is not what prevents refetch there.
- Consumer WITH explicit `staleTime` (the documented SWR pattern, `docs/concepts/resources.mdx` §Stale-While-Revalidate): dropping the coalesce leaves the entry `staleTime: 0` → `isStale` true → background `run(true)` → fetcher re-called, silently breaking the "prefetched entry is reused, fetcher not re-called" contract.

`resource()` itself writes `staleTime ?? Infinity` in all three of its cache writes (`resource.ts:299,437,441`) — prefetch matching that is consistent. Do not "correct" the prefetch call back to the raw `staleTime` option.

# Evidence

- `packages/resource/lib/resourceCache.ts:430` prefetch coalesce; `:109` `setCacheData(..., staleTime = 0)` default; `:69-72` `isStale` Infinity short-circuit.
- `packages/resource/lib/resource.ts:221` SWR guard `staleTime !== undefined && isStale(entry) && revalidateOnStale`; `staleTime` destructured with no default (`:93`).
- Guard test `packages/resource/tests/prefetch.test.ts:19` "prefetched entries are reused by a resource sharing the fetcher reference" → `expect(fetcher).toHaveBeenCalledTimes(1)`; `bun bundle resource --quiet && bun test packages/resource/tests/prefetch.test.ts` → 11 pass, 0 fail.
