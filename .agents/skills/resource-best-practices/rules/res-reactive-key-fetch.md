---
title: Turn on refetchOnKeyChange for reactive keys
impact: MEDIUM
impactDescription: a reactive key alone never refetches, so signal changes leave the resource serving stale data until something calls fetch or invalidate
tags: key, refetchOnKeyChange, enabled, auto-fetch
---

## Turn on refetchOnKeyChange for reactive keys

A `key` getter reading signals makes the key reactive, but tracking only arms with `refetchOnKeyChange: true` (default false): without it, changing a signal the key reads does nothing until a manual `fetch()` or `invalidate()`. With it on, the effect refetches on every key change. The effect deliberately skips fetches while an explicit key resolves to `null` or `undefined`, so model "dependency not ready yet" as a nullish key and premature requests are skipped for free. `fetch()` (manual) bypasses `enabled` only when `enabled` is a getter; a static `enabled: false` blocks manual fetches too.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const userId = signal(1);
const posts = resource((id: number) => fetch(`/api/users/${id}/posts`).then((r) => r.json()), {
  key: () => userId(),
});
userId(2);
// No refetch happens: key tracking is off, data() still holds user 1's posts
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

interface Post { id: number; title: string; }
const userId = signal<number | null>(null);
const fetchPosts = async (id: number | null): Promise<Post[]> =>
  (await fetch(`/api/users/${id}/posts`)).json();

const posts = resource(fetchPosts, {
  key: () => userId(), // null = not ready: the fetch is skipped
  refetchOnKeyChange: true,
});
userId(2); // automatically fetches user 2's posts
```

Reference: `packages/resource/lib/resource.ts` key-change effect and `packages/resource/docs/concepts/resources.mdx`
