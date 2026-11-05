---
title: Let deduplication join concurrent reads
impact: HIGH
impactDescription: hand-rolled in-flight guards or cache-fighting ad-hoc fetch calls duplicate the exact dedup the package already runs, or break it by isolating the fetcher
tags: deduplicate, dedup, force, concurrent, fetch
---

## Let deduplication join concurrent reads

`deduplicate` (default true) joins concurrent requests with the same fetcher and key into one network call: every joiner awaits the same promise and adopts the shared abort controller. The mechanism already absorbs the classic duplicate-fetch storms - a tab return firing focus plus visibility back-to-back, SWR overlapping a manual fetch, several components mounting around one key. Let each consumer call `fetch()` freely and share a named fetcher; do not wrap resources in your own in-flight maps. Two facts to code against: `fetch({ force: true })` skips the dedup lookup (but still registers, so later non-force fetches join the force request while it runs), and aborting one joined resource aborts the shared request and resets every joiner to its `initialData`.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const topic = signal("react");
let inFlight = false; // hand-rolled guard duplicating deduplicate
const posts = resource((t: string) => fetch(`/api/posts?topic=${t}`).then((r) => r.json()), {
  key: () => topic(),
});
function load() {
  if (inFlight) return;
  inFlight = true;
  posts.fetch().finally(() => {
    inFlight = false;
  });
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface Post { id: number; title: string; }
const fetchPosts = async (t: string): Promise<Post[]> =>
  (await fetch(`/api/posts?topic=${t}`)).json();

// Every consumer just fetches; concurrent same-key calls join one request
const a = resource(fetchPosts, { key: () => "react", cacheTime: 60_000 });
const b = resource(fetchPosts, { key: () => "react", cacheTime: 60_000 });
await Promise.all([a.fetch(), b.fetch()]); // one network call
```

Reference: `packages/resource/lib/internal/dedupe.ts` and `packages/resource/tests/deduplication.test.ts`
