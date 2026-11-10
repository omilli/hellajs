---
title: Map empty resource keys to null, not empty string
description: "A `resource()` key returning the empty string passes the `refetchOnKeyChange` skip gate (`keyVal != null`) and fires a real fetch at creation - keep the \"not ready\" state as `null` at the source (store field typed `string | null`, direct key) or map it (`key: () => id() || null`) so module-scope resources stay silent until an id is set."
tags: [resource, key, refetchOnKeyChange, null-skip, empty-string, examples]
confirmed: 2026-11-04
---

# Why

The `refetchOnKeyChange` effect gates the auto-fetch on `if (!hasExplicitKey || keyVal != null)` (`packages/resource/lib/resource.ts` `resource()` cleanup effect): only `null`/`undefined` keys skip fetching. An empty string is neither, so a module-scope resource keyed on an unset id (e.g. `key: () => appStore.postId()` with `postId: ""`) fires a junk request at module load - `GET /posts/` (200 with wrong payload) and `GET /users//posts` (400) in the blog example - before any page mounts. The failure is silent: wrong-arity API calls in the network tab and no error state anywhere. Empty string must NOT be skipped package-side: `""` is a meaningful key value (an empty search query legitimately fetches "everything"), so only the app knows whether empty means skip - model "not ready" as null at the source and read the key directly (`store<{ postId: string | null }>` initialized `null`), or map at the key boundary (`key: () => appStore.postId() || null`); either way the resource generic widens (`resource<Post, string | null>`) so the fetcher parameter accepts the null (the fetcher never actually receives null while the gate holds).

# Evidence

- `packages/resource/lib/resource.ts` `resource()` key-change effect: the fetch gate `keyVal != null` - `"" != null` evaluates true, so the fetch runs; the docs contract `packages/resource/docs/api/resource.mdx` `refetchOnKeyChange`: "Skips fetch while key resolves to null or undefined"; `.agents/skills/resource-best-practices/rules/res-reactive-key-fetch.md` teaches the nullable-source pattern (`signal<number | null>(null)` + direct key).
- `examples/blog/src/state.ts` `appStore` types `postId`/`userId` as `string | null` initialized `null` with direct keys (curl 2026-11-04: `https://dummyjson.com/users//posts` returns 400, `https://dummyjson.com/posts/` returns 301/200 - the junk calls observed before the fix).
