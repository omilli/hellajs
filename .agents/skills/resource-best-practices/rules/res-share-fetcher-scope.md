---
title: Share one named fetcher to share cache and dedup scope
impact: CRITICAL
impactDescription: cache and dedup entries live under the fetcher's own reference, so inline fetchers and URL strings give every resource a private scope and identical requests never share anything
tags: resource, fetcher, cache scope, deduplication, prefetch
---

## Share one named fetcher to share cache and dedup scope

The cache is a `Map` keyed by fetcher function reference and the dedup registry a `WeakMap` over the same key: scope identity is the fetcher, nothing else. Every `resource(url)` call wraps the URL in a fresh closure, and every inline arrow passed to `resource()` is a new reference, so two resources fetching the identical URL get separate cache scopes, separate dedup scopes, and always two network calls. Declare the fetcher once as a named function and pass that one reference to every consumer (and to `resourceCache.prefetch`) to share cache entries and join in-flight requests.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Two fresh closures: two scopes, two requests, no shared cache
const a = resource("/api/user");
const b = resource("/api/user");
await Promise.all([a.fetch(), b.fetch()]); // fetch() runs twice
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface User { id: number; name: string; }

// One named fetcher: one cache scope and one dedup scope
const fetchUser = async (): Promise<User> => (await fetch("/api/user")).json();

const profile = resource(fetchUser, { key: () => "user", cacheTime: 60_000 });
const header = resource(fetchUser, { key: () => "user", cacheTime: 60_000 });
await Promise.all([profile.fetch(), header.fetch()]); // deduplicated into one request
```

Reference: `packages/resource/lib/resourceCache.ts cacheMap` and `packages/resource/tests/prefetch.test.ts`
