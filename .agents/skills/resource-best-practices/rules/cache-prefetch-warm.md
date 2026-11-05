---
title: Warm caches with prefetch and a shared fetcher reference
impact: MEDIUM
impactDescription: prefetching with an inline fetcher writes a scope the mounted resource will never read, so the resource refetches what was just prefetched
tags: prefetch, resourceCache, cache warming, fetcher identity
---

## Warm caches with prefetch and a shared fetcher reference

`resourceCache.prefetch({ fetcher, key, ... })` fetches and caches without creating a resource, under the fetcher's own scope - exactly the scope a `resource()` with the same fetcher reference reads. It deduplicates (a concurrent same-fetcher+key prefetch or fetch joins one request), retries, and honors `timeout` and `abortSignal` like a resource fetch. The sharing is by reference identity only: an inline arrow passed to `prefetch` and a URL-string resource can never join a prefetched entry, because each creates its own scope. `cacheTime` defaults to `0` there too - a prefetch meant to warm must set it.

**Incorrect (what is wrong):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

// Inline fetcher: its prefetch warms a scope nothing else will ever read
await resourceCache.prefetch({
  fetcher: (key: string) => fetch(`/api/posts/${key}`).then((r) => r.json()),
  key: "react",
});
const posts = resource((k: string) => fetch(`/api/posts/${k}`).then((r) => r.json()), {
  key: () => "react",
  cacheTime: 60_000,
});
await posts.fetch(); // still a network call
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Post { id: number; title: string; }
const fetchPosts = async (key: string): Promise<Post[]> =>
  (await fetch(`/api/posts/${key}`)).json();

// Same fetcher reference: the resource joins the prefetched cache entry
await resourceCache.prefetch({ fetcher: fetchPosts, key: "react", cacheTime: 60_000 });
const posts = resource(fetchPosts, { key: () => "react", cacheTime: 60_000 });
await posts.fetch(); // cache hit - no network
```

Reference: `packages/resource/lib/resourceCache.ts prefetch` and `packages/resource/tests/prefetch.test.ts`
