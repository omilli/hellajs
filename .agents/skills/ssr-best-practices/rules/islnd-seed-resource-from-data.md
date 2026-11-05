---
title: Seed client state from the hella-data payload
impact: HIGH
impactDescription: rendering server data but shipping no payload forces the client to refetch from zero - a loading flash laid over markup that already showed the answer
tags: islands, data, payload, initialData, seeding
---

## Seed client state from the hella-data payload

Server-fetched values ride along through `doc({ data })`: the payload ships as `<script type="application/json" id="hella-data">` (with `<` escaped so no string breaks out), and the client recovers it in one line - `JSON.parse(document.getElementById("hella-data").textContent)`. Use that value to seed client state before hydration: a `resource` gets it as `initialData` (starting populated, consistent with the server HTML, no refetch on boot - see `resource-best-practices` for the resource side), plain signals initialize from it directly. Without the channel, the client boots empty and refetches what the server already knew.

**Incorrect (what is wrong):**

```tsx
import { ssr, doc } from "@hellajs/ssr";

interface User {
  id: number;
  name: string;
}

// The server HTML shows the user, but no payload ships: the client boots
// with nothing and refetches from zero over fully rendered markup.
const user: User = await fetch("/api/users/1").then((r) => r.json());
const page = doc({ body: ssr(<h1>Hello {user.name}</h1>) });
```

**Correct (what is right):**

```tsx
import { resource } from "@hellajs/resource";
import { ssr, doc } from "@hellajs/ssr";

interface User {
  id: number;
  name: string;
}

// Ship the fetched value; the client seeds the resource with initialData
// read from #hella-data and starts consistent with the server HTML.
const user: User = await fetch("/api/users/1").then((r) => r.json());
const page = doc({ body: ssr(<h1>Hello {user.name}</h1>), data: { user } });
```

Signals, functions, and class instances do not transfer - resolve them to plain values server-side first (see the data payload rule).

Reference: `packages/ssr/docs/api/doc.mdx` and `packages/ssr/docs/concepts/ssr.mdx`
