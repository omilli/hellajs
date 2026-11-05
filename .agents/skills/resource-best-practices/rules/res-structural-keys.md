---
title: Build keys from primitives and plain objects
impact: CRITICAL
impactDescription: keys holding dates, maps, sets, or class instances compare by reference, so a key rebuilt from signals misses the cache and dedup registry on every change and refetches forever
tags: key, stableKey, structural equality, cache
---

## Build keys from primitives and plain objects

Cache keys are normalized by `stableKey` before every cache and dedup lookup: arrays and plain objects serialize deterministically (object keys sorted, array order preserved, nested dates as ISO strings), so two separately built keys of the same shape hit the same entry. Any other object shape aborts hashing and falls back to reference identity: a top-level `Date`, `Map`, `Set`, or class instance, and also a plain object containing one anywhere inside it. Reference-keyed entries only hit when the exact same object is passed again, which a `key: () => ({ ...filters() })` rebuild never is. Use primitives or plain-object keys; convert dates to ISO strings and maps to plain objects at the key boundary. Hashed keys are opaque strings, so `invalidateByPrefix` and `invalidateByPattern` cannot match them - string keys only.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const since = signal(new Date("2026-01-01"));
// Date keys are reference-keyed: every rebuild of the key misses the cache
const log = resource(
  (d: Date) => fetch(`/api/log?since=${d.toISOString()}`).then((r) => r.json()),
  { key: () => since(), refetchOnKeyChange: true, cacheTime: 60_000 },
);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { resource } from "@hellajs/resource";

const since = signal("2026-01-01");
// Primitive keys (and plain objects of primitives) compare structurally
const log = resource(
  (iso: string) => fetch(`/api/log?since=${iso}`).then((r) => r.json()),
  { key: () => since(), refetchOnKeyChange: true, cacheTime: 60_000 },
);
```

Reference: `packages/resource/lib/internal/key.ts stableKey` and `packages/resource/tests/key-serialization.test.ts`
