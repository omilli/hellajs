---
title: Read isLoading, isFetching, and status; aborts never set error
impact: HIGH
impactDescription: aborts and timeouts clear the loading flags without setting error(), so UI branched on error() after cancellation shows nothing and dead spinner logic never settles
tags: isLoading, isFetching, status, error, abort, timeout
---

## Read isLoading, isFetching, and status; aborts never set error

`isLoading()` is true only for the initial load (no data at all); `isFetching()` is true for any network activity including background SWR refetches, dedup joins, and mutations; `status()` derives from data and flags, reading raw data so a transform can never change it. Abort paths - `abort()`, `timeout`, an external `abortSignal` - clear both flags without setting `error()`: the error signal only receives real fetcher failures. After a cancellation, `error()` is undefined and status falls back to data-derived (typically `idle`, or `success` when old data exists). Branch cancellation UI off your own abort call sites or `isIdle() && !isFetching()`, never off `error()`. The callbacks fire only on real settlements: `onSuccess` when fetched data lands, `onError` when a truthy error reaches the error signal - never for aborts, nor for the state-clearing calls (fetch start, cache hit, dedup join, reset).

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const query = resource(() => fetch("/api/query").then((r) => r.json()), { timeout: 5000 });
await query.fetch({ force: true });
if (query.error()) {
  // Never reached on timeout: aborts do not set error()
}
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const query = resource(() => fetch("/api/query").then((r) => r.json()), {
  timeout: 5000,
  initialData: [] as string[],
});
await query.fetch({ force: true });
// Timeout aborts: flags clear, error() stays undefined, initialData still readable
console.log(query.error()?.message ?? "no error", query.isLoading(), query.isFetching(), query.status());
```

Reference: `packages/resource/lib/resource.ts handleError` and `packages/resource/tests/errors.test.ts`
