---
title: Resources never fetch during a server render
impact: HIGH
impactDescription: the fetch pipeline is window-guarded, so a resource embedded in a server-rendered tree stays undefined and the HTML renders empty or throws
tags: server, resource, no-fetch, initialData, mutate
---

## Resources never fetch during a server render

`resource` is a reactive UI primitive; its `run()` guards on window presence as its first line, so on a server the fetcher never runs, focus and polling listeners never arm, and a resource embedded in a server-rendered tree renders with `data()` undefined forever - reading `.name` off it throws mid-walk. Produce render-time data outside the resource: fetch server-side with direct `fetch()` (or your data layer), then either render the value directly or hand it to the resource as `initialData` so it starts populated and the client continues from there. `mutate` is intentionally unguarded - it is user-initiated, so an SSR render never invokes it; never call it during render anyway. The full resource-side contract (scopes, keys, cache) is `resource-best-practices`.

**Incorrect (what is wrong):**

```tsx
import { resource } from "@hellajs/resource";
import { ssr } from "@hellajs/ssr";

const user = resource(() => fetch("/api/users/1").then((r) => r.json()));

// The server walk never fetches: data() stays undefined, so this render
// throws reading .name - and no listener ever arms to fix it later.
const body = ssr(<h1>Hello {() => user.data()?.name}</h1>);
```

**Correct (what is right):**

```tsx
import { resource } from "@hellajs/resource";
import { ssr } from "@hellajs/ssr";

interface User {
  id: number;
  name: string;
}

// Server code fetches directly and seeds the resource with initialData:
// the HTML renders the name and the client starts from the same value.
async function render(serverUser: User) {
  const user = resource(() => fetch("/api/users/1").then((r) => r.json()), {
    initialData: serverUser,
  });
  return ssr(<h1>Hello {() => user.data()?.name}</h1>);
}
```

Under `ssr.async`, a Promise-returning getter is the alternative path for server data - it awaits without any resource involvement.

Reference: `packages/ssr/AGENTS.md` and `packages/ssr/docs/api/ssr.mdx`
