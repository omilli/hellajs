---
title: Use abort, reset, and dispose for their distinct lifecycles
impact: HIGH
impactDescription: dispose leaves the resource dead forever and does not cancel in-flight requests, so using it as a refresh or cancel handle strands timers and late data writes
tags: abort, reset, dispose, timeout, abortSignal
---

## Use abort, reset, and dispose for their distinct lifecycles

`timeout` (ms before the internal controller fires) and an external `abortSignal` wire onto every internal controller and compose freely - both abort reads and mutations without setting `error()`. The three teardown verbs differ: `abort()` cancels the read and every in-flight mutation, resets data to `initialData`, and stops polling permanently (recreate the resource to resume polling); `reset()` returns to initial state, clears listeners, and re-arms polling, but does not abort in-flight requests; `dispose()` is one-way teardown of effects, timers, and listeners only - it neither aborts in-flight (a resolving fetcher still updates data after dispose) nor clears the cache, and the resource is dead afterward. Late resolutions after `abort()` are ignored.

**Incorrect (what is wrong):**

```ts
import { resource } from "@hellajs/resource";

const session = resource(() => fetch("/api/session").then((r) => r.json()), {
  refetchInterval: 5000,
});
session.dispose();
session.fetch(); // resource is dead: no reactive fetches, polling never resumes
```

**Correct (what is right):**

```ts
import { resource } from "@hellajs/resource";

const controller = new AbortController();
const session = resource(() => fetch("/api/session").then((r) => r.json()), {
  timeout: 5000,
  abortSignal: controller.signal,
  refetchInterval: 5000,
});
await session.fetch({ force: true }); // timeout aborts after 5s; error() stays undefined
controller.abort(); // coordinated external cancel: data resets to initialData
session.dispose(); // unmount teardown; does not abort in-flight, does not clear cache
```

Reference: `packages/resource/lib/resource.ts abort` and `packages/resource/tests/fetching.test.ts`
