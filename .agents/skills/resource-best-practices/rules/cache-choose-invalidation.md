---
title: Pick the right invalidation tool
impact: HIGH
impactDescription: every invalidation method except invalidateResources only deletes cache entries, so mounted resources keep rendering stale data and the screen never refreshes
tags: invalidate, invalidateByPrefix, invalidateByPattern, invalidateResources, invalidation
---

## Pick the right invalidation tool

Deletion is not refetch. `invalidate(key)`, `invalidateMultiple(keys)`, `invalidateByPrefix(prefix)`, `invalidateByPattern(regex)`, and `invalidateAll()` delete cache entries only: a mounted resource keeps its data and only the next fetch for a matched key goes to the network. When the screen must refresh now, call the resource's own `invalidate()` (cache delete plus immediate refetch for that resource) or `resourceCache.invalidateResources([...])`, which invokes each member's `invalidate()` synchronously. Prefix and pattern matching apply to string keys only - structurally hashed object and array keys are opaque strings no prefix or regex can meaningfully match.

**Incorrect (what is wrong):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

const reactPosts = resource((t: string) => fetch(`/api/posts?topic=${t}`).then((r) => r.json()), {
  key: () => "topic-react",
  cacheTime: 60_000,
});
await reactPosts.fetch({ force: true });

resourceCache.invalidateByPrefix("topic-");
// Cache hygiene only: the mounted list keeps rendering the stale fetch -
// nothing refetches until the next explicit fetch
```

**Correct (what is right):**

```ts
import { resource, resourceCache } from "@hellajs/resource";

interface Post { id: number; topic: string; }
const fetchPosts = async (t: string): Promise<Post[]> =>
  (await fetch(`/api/posts?topic=${t}`)).json();
const reactPosts = resource(fetchPosts, { key: () => "topic-react", cacheTime: 60_000 });

// Cache hygiene for every matching entry...
resourceCache.invalidateByPrefix("topic-");
// ...plus an immediate refetch for the mounted resource
resourceCache.invalidateResources([reactPosts]);
```

Reference: `packages/resource/lib/resourceCache.ts invalidateResources` and `packages/resource/tests/invalidates.test.ts`
