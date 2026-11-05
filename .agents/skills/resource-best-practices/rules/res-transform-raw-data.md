---
title: Keep transforms on the raw data plane
impact: MEDIUM
impactDescription: mapping inside the fetcher bakes the view shape into the cache and into mutate's return type, so writers and other readers of the same entry operate on the wrong shape
tags: transform, data, cache, mutations
---

## Keep transforms on the raw data plane

`transform: (data: T) => TTransformed` maps data for `data()` reads only: `data` is a computed over the raw signal, the cache stores the raw `T`, and `setData`/`mutate` operate on raw `T` end to end. Keep the fetcher returning the server shape and express views through `transform`. Because the cache is keyed by fetcher plus key, two resources on the same named fetcher and key share one raw entry while exposing different transforms - and join the same request through dedup.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Mapping inside the fetcher: the cache now holds view models, and any
// writer on this resource must speak view-model, not the server DTO
const userLabel = resource(async () => {
  const dto = (await (await fetch("/api/user")).json()) as { name: string; email: string };
  return dto.name.toUpperCase();
});
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface UserDto { id: number; name: string; email: string; }
const fetchUser = async (key: string): Promise<UserDto> =>
  (await fetch(`/api/users/${key}`)).json();

// One raw cache entry, two transformed views - both share the fetch and dedup
const userName = resource(fetchUser, {
  key: () => "user-1",
  cacheTime: 60_000,
  transform: (dto) => dto.name,
});
const userEmail = resource(fetchUser, {
  key: () => "user-1",
  cacheTime: 60_000,
  transform: (dto) => dto.email,
});
await Promise.all([userName.fetch(), userEmail.fetch()]);
```

Reference: `packages/resource/lib/resource.ts` data computed and `packages/resource/tests/transform.test.ts`
