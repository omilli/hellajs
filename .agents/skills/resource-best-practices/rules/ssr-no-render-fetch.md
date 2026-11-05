---
title: Fetch server data directly and seed initialData
impact: HIGH
impactDescription: expecting the resource to fetch during a server render leaves data undefined forever - run() returns before the fetcher whenever window is absent
tags: ssr, server, initialData, no-fetch
---

## Fetch server data directly and seed initialData

`run()` guards on window presence as its first line: on a server there is no fetch - resources embedded in a server-rendered tree never trigger network calls, and focus or polling listeners never arm. Render-time data must be produced outside the resource: fetch server-side with direct `fetch()` (or your data layer) and hand the result over as `initialData`. The resource then starts with data already present and stays consistent when client-side fetching takes over.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

// Server render: this fetch never happens - run() returns before the fetcher
const user = resource(() => fetch("/api/user").then((r) => r.json()));
await user.fetch(); // resolves undefined server-side; data() stays undefined
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

interface UserDto { id: number; name: string; }

// Server code fetches directly; the resource never fetches during render
function createUser(serverUser: UserDto | undefined) {
  return resource((key: string) => fetch(`/api/users/${key}`).then((r) => r.json()), {
    key: () => "user-1",
    initialData: serverUser,
  });
}
```

Reference: `packages/resource/lib/resource.ts run` and `packages/resource/tests/ssr-mode.test.ts`
