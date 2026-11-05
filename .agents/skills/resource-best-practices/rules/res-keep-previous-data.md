---
title: Set keepPreviousData false for per-key loading windows
impact: MEDIUM
impactDescription: the default keeps stale rows from the previous key on screen during a key-change refetch, which reads as wrong data in pagination and search UIs that need a loading state
tags: keepPreviousData, pagination, loading, key change
---

## Set keepPreviousData false for per-key loading windows

On a key change with `refetchOnKeyChange`, the default `keepPreviousData: true` keeps the previous key's data visible for the whole fetch window: `data()` returns the old value, `isLoading()` stays false, `isFetching()` turns true. Pagination and search UIs that must visually reset per key set `keepPreviousData: false`: the key change clears `rawData` to `undefined` (never back to `initialData` - a key change is a refetch, not the never-fetched state), `isLoading()` reads true and `status()` reads `"loading"` until the new key settles. The clear happens only on genuine key changes; enabled flips with an unchanged key never clear.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const page = signal(1);
const rows = resource((p: number) => fetch(`/api/rows?page=${p}`).then((r) => r.json()), {
  key: () => page(),
  refetchOnKeyChange: true,
});
page(2);
// Default keepPreviousData: page 1 rows stay on screen while page 2 loads -
// the user sees stale rows with no loading indication
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

interface Row { id: number; label: string; }
const page = signal(1);
const rows = resource((p: number) => fetch(`/api/rows?page=${p}`).then((r) => r.json()), {
  key: () => page(),
  refetchOnKeyChange: true,
  keepPreviousData: false, // page switch: data clears, status "loading" until settled
});
page(2); // data() undefined, isLoading() true - render the skeleton, not stale rows
```

Reference: `packages/resource/lib/resource.ts` key-change effect and `packages/resource/tests/keep-previous-data.test.ts`
